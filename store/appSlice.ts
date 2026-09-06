import { StateCreator } from 'zustand';
import { AppState, Notification, WebResource, SiteSettings } from '../types';
import { supabase } from '../services/supabaseClient';

export type AppSliceState = Pick<AppState,
  | 'siteSettings' | 'fetchSiteSettings' | 'updateSiteSettings'
  | 'notifications' | 'addNotification' | 'markNotificationRead' | 'markAllNotificationsRead'
  | 'resources' | 'addResource' | 'deleteResource'
>;

export const createAppSlice: StateCreator<AppState, [], [], AppSliceState> = (set, get) => ({
  siteSettings: null,
  fetchSiteSettings: async () => {
    try {
      const { data, error } = await supabase.from('system_settings').select('*').eq('key', 'footer_config').single();
      if (data && data.value) {
        set({ siteSettings: data.value as SiteSettings });
      } else if (!error) {
        const initial = {
          slogan: "Nâng tầm giáo dục số Việt Nam",
          hotline: "1900 xxxx",
          email: "support@openlms.vn",
          facebook: "https://facebook.com/openlms",
          zalo: "https://zalo.me/xxxx",
          address: "TP. Cần Thơ, Việt Nam"
        };
        set({ siteSettings: initial });
      }

      // Sync OpenRouter & Gemini API Keys from Supabase to localStorage
      try {
        const { data: openRouterKeyData } = await supabase
          .from('system_settings')
          .select('*')
          .eq('key', 'openrouter_api_key')
          .maybeSingle();
        if (openRouterKeyData?.value?.key) {
          localStorage.setItem('openrouter_api_key', openRouterKeyData.value.key.trim());
        }

        const { data: openRouterModelData } = await supabase
          .from('system_settings')
          .select('*')
          .eq('key', 'openrouter_model')
          .maybeSingle();
        if (openRouterModelData?.value?.model) {
          localStorage.setItem('openrouter_model', openRouterModelData.value.model.trim());
        }

        const { data: apiKeyData } = await supabase
          .from('system_settings')
          .select('*')
          .eq('key', 'gemini_api_key')
          .maybeSingle();
        if (apiKeyData?.value?.key) {
          localStorage.setItem('gemini_api_key', apiKeyData.value.key.trim());
        }
      } catch (keyErr) {
        console.error("Error fetching AI API keys from DB:", keyErr);
      }
    } catch (err) {
      console.error("Error fetching site settings:", err);
    }
  },

  updateSiteSettings: async (settings: SiteSettings) => {
    const { error } = await supabase.from('system_settings').upsert({
      key: 'footer_config',
      value: settings,
      updated_at: new Date().toISOString()
    });
    if (!error) {
      set({ siteSettings: settings });
      return true;
    }
    console.error("Error updating site settings:", error);
    return false;
  },

  notifications: [],
  addNotification: async (notif) => {
    const payload = {
      id: notif.id,
      user_id: notif.userId,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      is_read: notif.isRead,
      created_at: notif.createdAt,
      link: notif.link
    };

    const { error } = await supabase.from('notifications').insert(payload);
    if (error) console.error('Error inserting notification:', error);
    set((state) => ({ notifications: [notif, ...state.notifications] }));
  },
  markNotificationRead: async (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n)
    }));
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) {
       await supabase.from('notifications').update({ isRead: true }).eq('id', id);
    }
  },
  markAllNotificationsRead: async (userId) => {
    set((state) => ({
      notifications: state.notifications.map(n => n.userId === userId ? { ...n, isRead: true } : n)
    }));
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
    if (error) {
       await supabase.from('notifications').update({ isRead: true }).eq('userId', userId);
    }
  },

  resources: [],
  addResource: async (res) => {
    const payload = {
      id: res.id,
      title: res.title,
      url: res.url,
      type: res.type,
      topic: res.topic,
      description: res.description,
      added_by: res.addedBy,
      created_at: res.createdAt
    };

    let { error } = await supabase.from('resources').insert(payload);
    if (error) {
      // Fallback nếu schema cũ dùng camelCase
      const legacyPayload = {
        id: res.id,
        title: res.title,
        url: res.url,
        type: res.type,
        topic: res.topic,
        description: res.description,
        addedBy: res.addedBy,
        createdAt: res.createdAt
      };
      const retry = await supabase.from('resources').insert(legacyPayload);
      if (retry.error) {
        console.error("Lỗi khi thêm resource:", retry.error);
        return false;
      }
    }
    set(state => ({ resources: [res, ...state.resources] }));
    return true;
  },
  deleteResource: async (id) => {
    set(state => ({ resources: state.resources.filter(r => r.id !== id) }));
    await supabase.from('resources').delete().eq('id', id);
    return true;
  }
});
