'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BackToMarketLink } from '../component/BackToMarketLink';

type ChatMessage = {
  id: string;
  product_id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
};

type InboxConversationRow = {
  product_id: string;
  other_user_id: string;
  last_message_id: string;
  last_message_sender_id: string;
  last_message: string;
  last_message_at: string;
};

type Conversation = {
  productId: string;
  otherUserId: string;
  productTitle: string;
  otherName: string;
  lastMessage: string;
  unreadCount: number;
};

export default function InboxPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadInbox = useCallback(async (currentUserId: string) => {
    const { data: latestMessages, error: chatsError } = await supabase.rpc('get_inbox_conversations');
    if (chatsError) throw chatsError;
    const conversationRows = (latestMessages || []) as InboxConversationRow[];
    if (!conversationRows.length) {
      setConversations([]);
      setSelectedKey('');
      setLoading(false);
      return;
    }

    const productIds = [...new Set(conversationRows.map((conversation) => conversation.product_id))];
    const otherUserIds = [...new Set(conversationRows.map((conversation) => conversation.other_user_id))];
    const [productResult, profileResult, notificationResult] = await Promise.all([
      supabase.from('products').select('id, title').in('id', productIds),
      supabase.from('profiles').select('id, display_name').in('id', otherUserIds),
      supabase.from('notifications').select('data').eq('recipient_id', currentUserId).eq('type', 'chat_message').is('read_at', null),
    ]);
    const lookupError = productResult.error || profileResult.error || notificationResult.error;
    if (lookupError) throw lookupError;

    const productTitles = new Map((productResult.data || []).map((product) => [String(product.id), product.title]));
    const names = new Map((profileResult.data || []).map((profile) => [profile.id, profile.display_name]));
    const unreadByConversation = new Map<string, number>();
    for (const notification of notificationResult.data || []) {
      const data = notification.data as { product_id?: string; sender_id?: string } | null;
      if (data?.product_id && data.sender_id) {
        const key = `${data.product_id}:${data.sender_id}`;
        unreadByConversation.set(key, (unreadByConversation.get(key) || 0) + 1);
      }
    }

    const items = conversationRows.map((conversation) => {
      const otherUserId = conversation.other_user_id;
      const key = `${conversation.product_id}:${otherUserId}`;
      return {
        productId: conversation.product_id,
        otherUserId,
        productTitle: productTitles.get(conversation.product_id) || 'Marketplace listing',
        otherName: names.get(otherUserId) || 'Marketplace user',
        lastMessage: conversation.last_message,
        unreadCount: unreadByConversation.get(`${conversation.product_id}:${otherUserId}`) || 0,
        key,
      };
    });
    setConversations(items);
    const searchParams = new URLSearchParams(window.location.search);
    const requestedKey = searchParams.get('product') && searchParams.get('with')
      ? `${searchParams.get('product')}:${searchParams.get('with')}`
      : '';
    setSelectedKey((current) => current && items.some((item) => item.key === current)
      ? current
      : items.some((item) => item.key === requestedKey) ? requestedKey : items[0]?.key || '');
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
      try {
        await loadInbox(user.id);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load your inbox.');
          setLoading(false);
        }
      }
    };
    void initialize();
    return () => { cancelled = true; };
  }, [loadInbox, router]);

  useEffect(() => {
    const selectConversation = (event: Event) => {
      const detail = (event as CustomEvent<{ productId: string; otherUserId: string }>).detail;
      if (detail?.productId && detail.otherUserId) {
        setSelectedKey(`${detail.productId}:${detail.otherUserId}`);
      }
    };
    window.addEventListener('inbox:select-conversation', selectConversation);
    return () => window.removeEventListener('inbox:select-conversation', selectConversation);
  }, []);

  const selected = useMemo(
    () => conversations.find((conversation) => `${conversation.productId}:${conversation.otherUserId}` === selectedKey) || null,
    [conversations, selectedKey],
  );
  const selectedProductId = selected?.productId;
  const selectedOtherUserId = selected?.otherUserId;

  useEffect(() => {
    if (!selectedProductId || !selectedOtherUserId || !userId) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    const loadMessages = async () => {
      const { data, error: messagesError } = await supabase
        .from('chat_messages')
        .select('id, product_id, sender_id, recipient_id, message, created_at')
        .eq('product_id', selectedProductId)
        .or(
          `and(sender_id.eq.${userId},recipient_id.eq.${selectedOtherUserId}),and(sender_id.eq.${selectedOtherUserId},recipient_id.eq.${userId})`,
        )
        .order('created_at', { ascending: true })
        .limit(300);
      if (messagesError) throw messagesError;
      if (cancelled) return;
      setMessages((data || []).reverse());

      const { error: readError } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', userId)
        .eq('type', 'chat_message')
        .is('read_at', null)
        .contains('data', { product_id: selectedProductId, sender_id: selectedOtherUserId });
      if (readError) throw readError;
      await loadInbox(userId);

      channel = supabase
        .channel(`inbox-${selectedProductId}-${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `product_id=eq.${selectedProductId}`,
        }, (payload) => {
          const incoming = payload.new as ChatMessage;
          const isThisConversation =
            (incoming.sender_id === userId && incoming.recipient_id === selectedOtherUserId) ||
            (incoming.sender_id === selectedOtherUserId && incoming.recipient_id === userId);
          if (isThisConversation) {
            setMessages((current) => current.some((item) => item.id === incoming.id) ? current : [...current, incoming]);
            if (incoming.recipient_id === userId) {
              void supabase
                .from('notifications')
                .update({ read_at: new Date().toISOString() })
                .eq('recipient_id', userId)
                .eq('type', 'chat_message')
                .is('read_at', null)
                .contains('data', { product_id: selectedProductId, sender_id: selectedOtherUserId })
                .then(({ error: readError }) => {
                  if (readError) setError(`Could not mark new message as read: ${readError.message}`);
                });
            }
            void loadInbox(userId).catch((loadError: unknown) => {
              setError(loadError instanceof Error ? loadError.message : 'Could not refresh your inbox.');
            });
          }
        })
        .subscribe();
    };

    void loadMessages().catch((loadError: unknown) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Could not load this conversation.');
    });
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [loadInbox, selectedOtherUserId, selectedProductId, userId]);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !userId || !input.trim() || sending) return;
    setSending(true);
    setError('');
    const { data, error: sendError } = await supabase
      .from('chat_messages')
      .insert({
        product_id: selected.productId,
        sender_id: userId,
        recipient_id: selected.otherUserId,
        message: input.trim(),
      })
      .select('id, product_id, sender_id, recipient_id, message, created_at')
      .single();
    if (sendError) {
      setError(sendError.message);
    } else {
      setInput('');
      if (data) setMessages((current) => current.some((item) => item.id === data.id) ? current : [...current, data]);
      try {
        await loadInbox(userId);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Message sent, but the inbox could not refresh.');
      }
    }
    setSending(false);
  };

  return (
    <main className="min-h-[70vh] bg-slate-50 px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <BackToMarketLink />
        <h1 className="my-5 text-2xl font-bold text-slate-900 sm:text-3xl">Inbox</h1>
        {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="grid min-h-[65vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className={`${selected ? 'hidden md:block' : 'block'} border-b border-slate-200 md:border-b-0 md:border-r`} aria-label="Conversations">
            <h2 className="border-b px-4 py-4 text-sm font-bold text-slate-700">Conversations</h2>
            {loading && <p className="p-4 text-sm text-slate-500">Loading conversations...</p>}
            {!loading && conversations.length === 0 && <p className="p-4 text-sm text-slate-500">Messages about your listings will appear here.</p>}
            <div className="max-h-[65vh] overflow-y-auto">
              {conversations.map((conversation) => {
                const key = `${conversation.productId}:${conversation.otherUserId}`;
                return (
                  <button key={key} type="button" onClick={() => setSelectedKey(key)} className={`w-full border-b p-4 text-left transition-colors hover:bg-slate-50 ${selectedKey === key ? 'bg-orange-50' : ''}`}>
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900">{conversation.otherName}</span>
                        <span className="mt-1 block truncate text-xs font-medium text-orange-700">{conversation.productTitle}</span>
                      </span>
                      {conversation.unreadCount > 0 && <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">{conversation.unreadCount}</span>}
                    </span>
                    <span className="mt-2 block truncate text-sm text-slate-500">{conversation.lastMessage}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className={`${selected ? 'flex' : 'hidden md:flex'} min-h-[65vh] flex-col`} aria-label="Selected conversation">
            {!selected ? <p className="m-auto p-6 text-center text-sm text-slate-500">Choose a conversation to read and reply.</p> : (
              <>
                <header className="flex items-center gap-3 border-b px-4 py-3 sm:px-5">
                  <button type="button" onClick={() => setSelectedKey('')} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden" aria-label="Back to conversations"><ArrowLeft className="h-5 w-5" /></button>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-bold text-slate-900">{selected.otherName}</h2>
                    <Link href={`/product/${selected.productId}`} className="block truncate text-sm text-blue-700 hover:underline">{selected.productTitle}</Link>
                  </div>
                </header>
                <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5" aria-live="polite">
                  {messages.map((message) => (
                    <div key={message.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm sm:max-w-[75%] ${message.sender_id === userId ? 'ml-auto rounded-br-sm bg-blue-700 text-white' : 'rounded-bl-sm bg-slate-100 text-slate-800'}`}>
                      <p className="whitespace-pre-wrap break-words">{message.message}</p>
                      <time className={`mt-1 block text-right text-[11px] ${message.sender_id === userId ? 'text-blue-100' : 'text-slate-500'}`} dateTime={message.created_at}>{new Date(message.created_at).toLocaleString()}</time>
                    </div>
                  ))}
                </div>
                <form onSubmit={sendMessage} className="flex gap-2 border-t p-3 sm:p-4">
                  <label className="sr-only" htmlFor="inbox-message">Message</label>
                  <textarea id="inbox-message" rows={1} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }} placeholder="Write a message..." className="min-w-0 flex-1 resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none" />
                  <button type="submit" disabled={sending || !input.trim()} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50 sm:px-4">
                    <Send className="h-4 w-4" /><span className="hidden sm:inline">{sending ? 'Sending...' : 'Send'}</span>
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
