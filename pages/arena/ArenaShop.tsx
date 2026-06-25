import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { useStore } from '../../store';
import { 
  ArrowLeft, Star, Trophy, Shield, Coins, ShoppingBag, 
  Check, AlertCircle, ShoppingCart, Sparkles, Wand2 
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  tier: number;
  xp_price: number;
  elo_price: number;
  min_elo_requirement: number;
  emoji: string;
  effect_type: string;
  effect_value: number;
}

interface InventoryItem {
  id: string;
  item_id: string;
  quantity: number;
  is_equipped: boolean;
  times_used: number;
  arena_shop_items: ShopItem;
}

export const ArenaShop: React.FC = () => {
  const { user, arenaProfile, fetchArenaProfile } = useStore();
  const navigate = useNavigate();
  
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'shop' | 'inventory'>('shop');
  const [selectedTier, setSelectedTier] = useState<number>(0); // 0 = All, 1-5
  const [buyingId, setBuyingId] = useState<string | null>(null);

  // Fetch shop items & student inventory
  const loadData = async () => {
    if (!user) return;
    try {
      // 1. Fetch shop items
      const { data: items, error: itemsErr } = await supabase
        .from('arena_shop_items')
        .select('*')
        .order('tier', { ascending: true })
        .order('xp_price', { ascending: true });

      if (itemsErr) throw itemsErr;
      setShopItems(items || []);

      // 2. Fetch inventory
      const { data: inv, error: invErr } = await supabase
        .from('arena_inventory')
        .select(`
          *,
          arena_shop_items:item_id (*)
        `)
        .eq('student_id', user.id);

      if (invErr) throw invErr;
      setInventory(inv as any[] || []);
      
      // 3. Sync profile
      await fetchArenaProfile(user.id);
    } catch (error: any) {
      console.error("Error loading shop data:", error);
      toast.error("Không thể tải thông tin cửa hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Handle buy item
  const handleBuy = async (item: ShopItem) => {
    if (!user || !arenaProfile) return;

    // Fast check client-side
    if (arenaProfile.elo_rating < item.min_elo_requirement) {
      toast.error(`Yêu cầu Elo tối thiểu là ${item.min_elo_requirement}`);
      return;
    }
    if (arenaProfile.total_xp < item.xp_price) {
      toast.error('Không đủ XP để mua vật phẩm này!');
      return;
    }
    if (item.elo_price > 0 && arenaProfile.elo_rating <= item.elo_price) {
      toast.error('Elo của bạn quá thấp để khấu trừ!');
      return;
    }

    setBuyingId(item.id);
    try {
      const { data, error } = await supabase.rpc('buy_arena_item', {
        p_item_id: item.id
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };
      if (result.success) {
        toast.success(result.message);
        loadData();
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      console.error("Error buying item:", err);
      toast.error("Lỗi hệ thống khi mua hàng");
    } finally {
      setBuyingId(null);
    }
  };

  // Toggle equip item
  const handleToggleEquip = async (invItem: InventoryItem) => {
    if (!user) return;

    const currentlyEquippedCount = inventory.filter(i => i.is_equipped).length;
    
    // Limit to max 2 equipped items
    if (!invItem.is_equipped && currentlyEquippedCount >= 2) {
      toast.error("Chỉ được trang bị tối đa 2 vật phẩm cùng lúc!");
      return;
    }

    try {
      const { error } = await supabase
        .from('arena_inventory')
        .update({ is_equipped: !invItem.is_equipped })
        .eq('id', invItem.id);

      if (error) throw error;
      toast.success(invItem.is_equipped ? "Đã tháo trang bị" : "Đã trang bị thành công!");
      loadData();
    } catch (err) {
      console.error("Error equipping item:", err);
      toast.error("Không thể thay đổi trạng thái trang bị");
    }
  };

  const filteredItems = selectedTier === 0 
    ? shopItems 
    : shopItems.filter(item => item.tier === selectedTier);

  const getTierName = (tier: number) => {
    switch(tier) {
      case 1: return "Bậc 1: Tiêu hao Phổ thông";
      case 2: return "Bậc 2: Trang bị Hiếm";
      case 3: return "Bậc 3: Cổ vật Sử thi";
      case 4: return "Bậc 4: Bảo vật Truyền thuyết";
      case 5: return "Bậc 5: Thần Binh Thượng Cổ";
      default: return "";
    }
  };

  const getTierColor = (tier: number) => {
    switch(tier) {
      case 1: return "from-gray-500 to-slate-600 shadow-slate-900/50";
      case 2: return "from-blue-500 to-cyan-600 shadow-blue-900/50";
      case 3: return "from-purple-500 to-indigo-600 shadow-purple-900/50";
      case 4: return "from-amber-500 to-orange-600 shadow-amber-900/50";
      case 5: return "from-red-600 to-rose-600 animate-pulse shadow-rose-900/50";
      default: return "from-gray-500 to-slate-600";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-400">Đang mở Cửa Hàng Arena...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto bg-[#030712] rounded-3xl p-6 md:p-8 text-gray-100 border border-white/5 shadow-2xl overflow-hidden min-h-[85vh] relative">
      <Toaster position="top-center" />
      
      {/* Background decoration */}
      <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-purple-600/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full bg-pink-600/5 blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/arena')}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition border border-white/5"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 flex items-center gap-2">
              🏪 Cửa Hàng Đấu Trường
            </h1>
            <p className="text-xs text-gray-400">Trang bị sức mạnh bằng tri thức, củng cố vị thế xếp hạng</p>
          </div>
        </div>

        {/* Currency Display */}
        {arenaProfile && (
          <div className="flex gap-3 bg-white/5 p-2 rounded-2xl border border-white/5">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 font-bold text-sm">
              <Star className="h-4 w-4 text-purple-400 fill-purple-400" />
              <span>{arenaProfile.total_xp} XP</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold text-sm">
              <Trophy className="h-4 w-4 text-amber-400 fill-amber-400" />
              <span>{arenaProfile.elo_rating} ELO</span>
            </div>
          </div>
        )}
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex gap-4 border-b border-white/5 pb-3 mb-6 relative z-10">
        <button
          onClick={() => setActiveTab('shop')}
          className={`flex items-center gap-2 pb-2 px-1 font-bold text-sm relative transition-colors ${
            activeTab === 'shop' ? 'text-purple-400' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <ShoppingBag className="h-4 w-4" /> Cửa Hàng Vật Phẩm
          {activeTab === 'shop' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500 rounded-full"></span>}
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 pb-2 px-1 font-bold text-sm relative transition-colors ${
            activeTab === 'inventory' ? 'text-purple-400' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Shield className="h-4 w-4" /> Rương Đồ ({inventory.length})
          {activeTab === 'inventory' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500 rounded-full"></span>}
        </button>
      </div>

      {/* SHOP VIEW */}
      {activeTab === 'shop' && (
        <div className="space-y-6 relative z-10">
          {/* Tiers Selector */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTier(0)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                selectedTier === 0 
                  ? 'bg-purple-600 border-purple-500 text-white shadow-lg' 
                  : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              Tất Cả
            </button>
            {[1, 2, 3, 4, 5].map(tier => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  selectedTier === tier 
                    ? 'bg-purple-600 border-purple-500 text-white shadow-lg' 
                    : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                Bậc {tier}
              </button>
            ))}
          </div>

          {/* Shop items grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredItems.map(item => {
              const ownItem = inventory.find(i => i.item_id === item.id);
              const quantityOwned = ownItem ? ownItem.quantity : 0;
              const hasRequirement = arenaProfile ? arenaProfile.elo_rating >= item.min_elo_requirement : false;
              const hasEnoughXp = arenaProfile ? arenaProfile.total_xp >= item.xp_price : false;
              const hasEnoughElo = arenaProfile ? (item.elo_price === 0 || arenaProfile.elo_rating > item.elo_price) : false;
              const canBuy = hasRequirement && hasEnoughXp && hasEnoughElo;

              return (
                <div 
                  key={item.id}
                  className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col justify-between hover:border-white/10 transition duration-300 shadow-lg relative group overflow-hidden"
                >
                  {/* Banner Tier color overlay */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-30 group-hover:opacity-100 transition-opacity"></div>

                  <div>
                    {/* Item Emoji and Title */}
                    <div className="flex justify-between items-start mb-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getTierColor(item.tier)} flex items-center justify-center text-2xl shadow-lg`}>
                        {item.emoji}
                      </div>
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-white/10 text-gray-300 border border-white/10">
                        Bậc {item.tier}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-white text-sm mb-1 group-hover:text-purple-400 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-gray-400 leading-relaxed mb-4 min-h-[44px]">
                      {item.description}
                    </p>

                    {/* Elo Requirement warning */}
                    {item.min_elo_requirement > 0 && (
                      <div className={`text-[10px] font-bold py-1 px-2 rounded-lg mb-3 flex items-center gap-1 ${
                        hasRequirement ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-red-500/10 text-red-400 border border-red-500/10'
                      }`}>
                        <Trophy className="h-3 w-3" />
                        <span>Yêu cầu Elo: {item.min_elo_requirement}+ ({hasRequirement ? 'Đạt' : 'Chưa đạt'})</span>
                      </div>
                    )}
                  </div>

                  {/* Pricing and Action */}
                  <div className="mt-auto pt-4 border-t border-white/5 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Giá mua:</span>
                      <div className="flex flex-col items-end">
                        <span className={`font-black flex items-center gap-1 ${hasEnoughXp ? 'text-purple-300' : 'text-red-400'}`}>
                          <Star className="h-3 w-3 fill-current" /> {item.xp_price} XP
                        </span>
                        {item.elo_price > 0 && (
                          <span className={`font-black flex items-center gap-1 ${hasEnoughElo ? 'text-amber-300' : 'text-red-400'}`}>
                            <Trophy className="h-3 w-3 fill-current" /> -{item.elo_price} ELO
                          </span>
                        )}
                      </div>
                    </div>

                    {quantityOwned > 0 && (
                      <div className="text-[10px] text-purple-300 text-center font-bold">
                        Đang sở hữu: {quantityOwned} cái
                      </div>
                    )}

                    <button
                      onClick={() => handleBuy(item)}
                      disabled={buyingId !== null || !canBuy}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                        canBuy 
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:-translate-y-0.5' 
                          : 'bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed'
                      }`}
                    >
                      {buyingId === item.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <ShoppingCart className="h-3.5 w-3.5" />
                          MUA NGAY
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* INVENTORY VIEW */}
      {activeTab === 'inventory' && (
        <div className="space-y-6 relative z-10">
          <div className="bg-gradient-to-r from-indigo-950/40 to-purple-950/40 border border-indigo-900/30 rounded-2xl p-4 flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-purple-400 animate-pulse" />
            <p className="text-xs text-indigo-200">
              Bạn có thể trang bị tối đa **2 bảo vật/kỹ năng chủ động** để mang vào võ đài **Đấu trí 1v1**. Các trang bị bị động hoặc tiêu hao sẽ tự động áp dụng khi leo tháp hoặc làm bài tập.
            </p>
          </div>

          {inventory.length === 0 ? (
            <div className="text-center py-16 bg-white/[0.01] border border-white/5 rounded-3xl">
              <ShoppingBag className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-bold">Rương đồ trống rỗng</p>
              <p className="text-xs text-gray-500 mt-1">Hãy ghé thăm Cửa Hàng để mua sắm vật phẩm hỗ trợ!</p>
              <button 
                onClick={() => setActiveTab('shop')} 
                className="mt-4 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition"
              >
                Ghé Cửa Hàng
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {inventory.map(invItem => {
                const item = invItem.arena_shop_items;
                if (!item) return null;

                const isBattleItem = ['heal', 'time_add', 'streak_protection', 'xp_boost', 'first_damage_reduction', 'easy_question_rate', 'cooldown_reduction', 'remove_wrong_choice', 'speed_boost', 'damage_reduction', 'lifesteal_on_miss', 'fast_answer_dmg', 'freeze_opponent', 'counter_attack_both_miss', 'stealth_start', 'triple_xp_day_shield', 'swap_question_mastery', 'copy_opponent_choice', 'reveal_correct_answer'].includes(item.effect_type);

                return (
                  <div 
                    key={invItem.id}
                    className={`border rounded-2xl p-5 flex flex-col justify-between hover:shadow-lg transition duration-300 relative ${
                      invItem.is_equipped 
                        ? 'bg-purple-950/20 border-purple-500' 
                        : 'bg-white/[0.02] border-white/5'
                    }`}
                  >
                    {invItem.is_equipped && (
                      <div className="absolute -top-2.5 -right-2.5 bg-purple-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full border-2 border-[#030712] shadow-lg flex items-center gap-0.5">
                        <Check className="h-2.5 w-2.5" /> Đã mặc
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getTierColor(item.tier)} flex items-center justify-center text-2xl shadow-lg`}>
                          {item.emoji}
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold bg-white/5 px-2 py-0.5 rounded border border-white/5">
                          Số lượng: {invItem.quantity}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-white text-sm mb-1">{item.name}</h3>
                      <p className="text-[11px] text-gray-400 leading-normal mb-3">{item.description}</p>
                      
                      <div className="text-[10px] text-gray-500">
                        Đã sử dụng: <span className="font-bold text-gray-300">{invItem.times_used} lần</span>
                      </div>
                    </div>

                    {isBattleItem && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <button
                          onClick={() => handleToggleEquip(invItem)}
                          className={`w-full py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1 ${
                            invItem.is_equipped 
                              ? 'bg-purple-600 text-white hover:bg-purple-700' 
                              : 'bg-white/5 text-gray-200 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {invItem.is_equipped ? (
                            <>Tháo Trang Bị</>
                          ) : (
                            <>Trang Bị Hỗ Trợ 1v1</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
