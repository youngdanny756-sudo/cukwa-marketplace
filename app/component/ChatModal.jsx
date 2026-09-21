import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ChatModal = ({ productId, productTitle, sellerId, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let channel;
    let cancelled = false;

    const loadChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!user) {
        setError('Please log in to use chat.');
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data, error: loadError } = await supabase
        .from('chat_messages')
        .select('id, sender_id, recipient_id, message, created_at')
        .eq('product_id', productId)
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${sellerId}),and(sender_id.eq.${sellerId},recipient_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true });

      if (cancelled) return;

      if (loadError) {
        setError(loadError.message);
      } else {
        setMessages(data || []);
      }

      channel = supabase
        .channel(`chat-${productId}-${user.id}-${crypto.randomUUID()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `product_id=eq.${productId}` },
          (payload) => {
            const message = payload.new;
            const isConversationMessage =
              (message.sender_id === user.id && message.recipient_id === sellerId) ||
              (message.sender_id === sellerId && message.recipient_id === user.id);

            if (isConversationMessage) {
              setMessages((current) =>
                current.some((item) => item.id === message.id)
                  ? current
                  : [...current, message]
              );
            }
          }
        )
        .subscribe();

      setLoading(false);
    };

    loadChat();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [productId, sellerId]);

  const handleSend = () => {
    const message = input.trim();
    if (!message || !userId || sending) return;

    setSending(true);
    setError('');

    supabase
      .from('chat_messages')
      .insert({
        product_id: productId,
        sender_id: userId,
        recipient_id: sellerId,
        message,
      })
      .then(({ error: sendError }) => {
        if (sendError) setError(sendError.message);
        else setInput('');
        setSending(false);
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-blue-700 p-4 text-white">
          <div>
            <h3 className="font-semibold">Chat with Seller</h3>
            <p className="text-sm text-blue-100">{productTitle}</p>
          </div>
          <button onClick={onClose} className="text-xl" aria-label="Close chat">X</button>
        </div>

        <div className="min-h-64 flex-1 space-y-3 overflow-y-auto p-4">
          {loading && <p className="text-sm text-gray-500">Loading messages...</p>}
          {!loading && messages.length === 0 && (
            <p className="text-sm text-gray-500">Start the conversation about this product.</p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                msg.sender_id === userId
                  ? 'ml-auto bg-blue-700 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.message}
            </div>
          ))}
        </div>

        {error && <p className="px-4 text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 border-t p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-black outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="rounded-xl bg-orange-500 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;