'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Notification = {
  id: string;
  type: 'chat_message' | 'listing_approved' | 'listing_rejected';
  title: string;
  body: string;
  data: { product_id?: string; sender_id?: string };
  read_at: string | null;
  created_at: string;
};

export function InboxNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const unreadCount = notifications.filter((notification) => !notification.read_at).length;

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;
    let activeUserId: string | null = null;

    const loadNotifications = async (userId: string) => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, body, data, read_at, created_at')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (cancelled || activeUserId !== userId) return;
      if (error) {
        setNotificationError(`Could not load notifications: ${error.message}`);
        return;
      }
      setNotificationError('');
      setNotifications(data || []);

      channel = supabase
        .channel(`notifications-${userId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        }, (payload) => {
          if (activeUserId !== userId) return;
          if (payload.eventType === 'INSERT') {
            setNotifications((items) => [payload.new as Notification, ...items].slice(0, 20));
          } else if (payload.eventType === 'UPDATE') {
            setNotifications((items) => items.map((item) => item.id === payload.new.id ? payload.new as Notification : item));
          }
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setNotificationError('Live notification updates are unavailable. Refresh the page to check for new notifications.');
          }
        });
    };

    const switchUser = (userId: string | null) => {
      if (cancelled || activeUserId === userId) return;
      activeUserId = userId;
      setNotifications([]);
      setNotificationError('');
      if (channel) {
        void supabase.removeChannel(channel);
        channel = undefined;
      }
      if (userId) void loadNotifications(userId);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => switchUser(session?.user.id || null), 0);
    });
    void supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error) setNotificationError(`Could not check your account: ${error.message}`);
      else switchUser(user?.id || null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  const markAllRead = async () => {
    const unreadIds = notifications.filter((item) => !item.read_at).map((item) => item.id);
    if (!unreadIds.length) return;
    const readAt = new Date().toISOString();
    const { error } = await supabase.from('notifications').update({ read_at: readAt }).in('id', unreadIds);
    if (error) {
      setNotificationError(`Could not mark notifications as read: ${error.message}`);
      return;
    }
    setNotificationError('');
    setNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at || readAt })));
  };

  const markNotificationRead = async (notificationId: string) => {
    const readAt = new Date().toISOString();
    const { error } = await supabase.from('notifications').update({ read_at: readAt }).eq('id', notificationId);
    if (error) {
      setNotificationError(`Could not mark notification as read: ${error.message}`);
      return;
    }
    setNotificationError('');
    setNotifications((items) => items.map((item) => item.id === notificationId ? { ...item, read_at: readAt } : item));
  };

  return (
    <div className="relative flex items-center gap-1">
      <Link href="/inbox" aria-label="Open inbox" title="Inbox" className="relative rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#F37021]">
        <MessageCircle className="h-5 w-5" />
      </Link>
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="relative rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#F37021]"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs font-bold leading-5 text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {isOpen && (
        <section className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" aria-label="Recent notifications">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-bold text-slate-900">Notifications</h2>
            {unreadCount > 0 && <button type="button" onClick={markAllRead} className="text-xs font-semibold text-blue-700 hover:underline">Mark all read</button>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notificationError && <p role="alert" className="border-b bg-red-50 p-3 text-xs text-red-700">{notificationError}</p>}
            {notifications.length === 0 ? <p className="p-4 text-sm text-slate-500">You’re all caught up.</p> : notifications.map((notification) => (
              <Link
                key={notification.id}
                href={notification.type === 'chat_message' && notification.data.product_id && notification.data.sender_id
                  ? `/inbox?product=${encodeURIComponent(notification.data.product_id)}&with=${encodeURIComponent(notification.data.sender_id)}`
                  : notification.type === 'chat_message' ? '/inbox' : '/dashboard'}
                onClick={() => {
                  setIsOpen(false);
                  if (notification.type === 'chat_message' && notification.data.product_id && notification.data.sender_id) {
                    window.dispatchEvent(new CustomEvent('inbox:select-conversation', {
                      detail: { productId: notification.data.product_id, otherUserId: notification.data.sender_id },
                    }));
                  }
                  if (!notification.read_at) void markNotificationRead(notification.id);
                }}
                className={`block border-b px-4 py-3 transition-colors hover:bg-slate-50 ${notification.read_at ? '' : 'bg-orange-50/70'}`}
              >
                <p className="text-sm font-bold text-slate-800">{notification.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{notification.body}</p>
                <time className="mt-1 block text-xs text-slate-400" dateTime={notification.created_at}>{new Date(notification.created_at).toLocaleString()}</time>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
