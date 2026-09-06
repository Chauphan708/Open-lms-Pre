import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useParentStore } from '../../services/parentStore';
import { supabase } from '../../services/supabaseClient';
import { Key, Lock, Users, Loader2, ArrowRight, User, Mail, Phone, Eye, EyeOff, CheckCircle2, AlertCircle, X } from 'lucide-react';

export const ParentLogin = () => {
  const { parentLogin, parentRegister, isParentLoading } = useParentStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  
  // Login Form States
  const [linkCodeOrEmail, setLinkCodeOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password States
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResult, setForgotResult] = useState<{
    type: 'success' | 'error';
    message: string;
    maskedEmail?: string;
  } | null>(null);

  const maskEmail = (emailStr: string) => {
    if (!emailStr || !emailStr.includes('@')) return emailStr;
    const [name, domain] = emailStr.split('@');
    if (name.length <= 2) return `${name[0]}*@${domain}`;
    const start = name.slice(0, 2);
    const end = name.slice(-2);
    return `${start}${'•'.repeat(Math.max(3, name.length - 4))}${end}@${domain}`;
  };

  const handleOpenForgotPassword = () => {
    const currentInput = linkCodeOrEmail.trim();
    setForgotInput(currentInput);
    setShowForgotPassword(true);
    if (currentInput) {
      triggerResetPassword(currentInput);
    } else {
      setForgotResult(null);
    }
  };

  const triggerResetPassword = async (identifier: string) => {
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) {
      setForgotResult({
        type: 'error',
        message: 'Vui lòng nhập Email hoặc Mã liên kết của bạn.'
      });
      return;
    }

    setForgotLoading(true);
    setForgotResult(null);

    try {
      const { data: parent } = await supabase
        .from('parents')
        .select('id, name, email, link_code')
        .or(`link_code.ilike.${cleanId},email.ilike.${cleanId},phone.eq.${cleanId}`)
        .maybeSingle();

      if (parent && parent.email) {
        const { error: sendErr } = await supabase.auth.resetPasswordForEmail(parent.email, {
          redirectTo: `${window.location.origin}/reset-password?role=parent`
        });

        if (sendErr) {
          setForgotResult({
            type: 'error',
            message: sendErr.message || 'Lỗi khi gửi email khôi phục. Vui lòng thử lại.'
          });
        } else {
          setForgotResult({
            type: 'success',
            maskedEmail: maskEmail(parent.email),
            message: `Hệ thống đã tự động gửi liên kết đổi mật khẩu đến email phụ huynh: ${maskEmail(parent.email)}. Vui lòng kiểm tra hộp thư đến (và thư mục Spam) để hoàn tất.`
          });
        }
        setForgotLoading(false);
        return;
      }

      setForgotResult({
        type: 'error',
        message: `Không tìm thấy tài khoản phụ huynh tương ứng với "${identifier}". Vui lòng kiểm tra lại Mã liên kết hoặc Email.`
      });
    } catch (e: any) {
      console.error("Forgot password error:", e);
      setForgotResult({
        type: 'error',
        message: 'Có lỗi xảy ra khi tìm kiếm tài khoản. Vui lòng thử lại.'
      });
    } finally {
      setForgotLoading(false);
    }
  };
  
  // Register Form States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkCodeOrEmail.trim()) {
      setError('Vui lòng nhập Email hoặc Mã liên kết.');
      return;
    }

    setError('');
    setSuccess('');
    const result = await parentLogin(linkCodeOrEmail.trim(), password);
    
    if (result.success) {
      const from = (location.state as any)?.from?.pathname || "/parent/dashboard";
      navigate(from, { replace: true });
    } else {
      setError(result.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Vui lòng nhập đầy đủ các thông tin bắt buộc (*).');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Mật khẩu phải dài tối thiểu 6 ký tự.');
      return;
    }

    setError('');
    setSuccess('');
    const result = await parentRegister(regName, regEmail, regPassword, regPhone);

    if (result.success) {
      setSuccess(result.message);
      // Reset form
      setRegName('');
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
      setRegConfirmPassword('');
      // Switch mode to login
      setTimeout(() => {
        setMode('LOGIN');
        setLinkCodeOrEmail(regEmail);
        setSuccess('');
      }, 2000);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-b-[4rem] shadow-lg opacity-90" />
      <div className="absolute top-10 left-10 text-white/10 pointer-events-none">
         <Users className="w-48 h-48" />
      </div>

      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl w-full max-w-md p-8 relative z-10 border border-white/50 transition-all duration-300">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-3 border-4 border-white shadow-md">
            <Users className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Cổng Phụ Huynh</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Theo dõi & Đồng hành cùng quá trình học tập của con</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
          <button
            onClick={() => { setMode('LOGIN'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              mode === 'LOGIN'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Đăng Nhập
          </button>
          <button
            onClick={() => { setMode('REGISTER'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              mode === 'REGISTER'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Đăng Ký
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-semibold border border-red-100 text-center mb-4 animate-shake">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-semibold border border-emerald-100 text-center mb-4">
            {success}
          </div>
        )}

        {mode === 'LOGIN' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Email hoặc Mã liên kết</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  value={linkCodeOrEmail}
                  onChange={(e) => setLinkCodeOrEmail(e.target.value)}
                  placeholder="Nhập Email hoặc Mã liên kết con"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={linkCodeOrEmail.includes('@') ? "Nhập mật khẩu tài khoản" : "Mật khẩu (Tùy chọn)"}
                  className="w-full pl-10 pr-10 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {!linkCodeOrEmail.includes('@') && (
                <p className="text-[10px] text-gray-400 mt-1">Bỏ trống mật khẩu nếu dùng Mã liên kết do Giáo viên cấp.</p>
              )}
              <div className="flex justify-end items-center mt-1.5">
                <button
                  type="button"
                  onClick={handleOpenForgotPassword}
                  className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold transition-colors"
                >
                  Quên mật khẩu?
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isParentLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 mt-6"
            >
              {isParentLoading ? (
                 <Loader2 className="w-5 h-5 animate-spin" /> 
              ) : (
                 <>Đăng Nhập <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Họ & Tên Phụ Huynh <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Nhập họ và tên đầy đủ"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Email liên hệ <span className="text-red-500">*</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="email" 
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="phuhuynh@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Số điện thoại (Tùy chọn)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="tel" 
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="Nhập số điện thoại liên hệ"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Mật khẩu <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input 
                    type="password" 
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mật khẩu"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 font-medium text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Nhập lại <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input 
                    type="password" 
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Xác nhận"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 font-medium text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isParentLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 mt-6"
            >
              {isParentLoading ? (
                 <Loader2 className="w-5 h-5 animate-spin" /> 
              ) : (
                 <>Đăng Ký Tài Khoản <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            {mode === 'LOGIN' 
              ? "Bạn là phụ huynh mới? Chuyển sang thẻ 'Đăng Ký' để tự tạo tài khoản."
              : "Đã có tài khoản? Nhấn 'Đăng Nhập' để truy cập vào hệ thống."
            }
          </p>
        </div>

        {/* Parent Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-fade-in text-left border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Key className="h-5 w-5 text-emerald-600" /> Khôi phục mật khẩu Phụ huynh
                </h3>
                <button 
                  onClick={() => setShowForgotPassword(false)} 
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Status / Results */}
              {forgotLoading ? (
                <div className="py-8 text-center space-y-3">
                  <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mx-auto" />
                  <p className="text-sm font-medium text-gray-600">Đang nhận diện tài khoản và gửi liên kết đổi mật khẩu...</p>
                </div>
              ) : forgotResult?.type === 'success' ? (
                <div className="space-y-4 py-2 text-center">
                  <div className="h-14 w-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-900 text-base">Đã gửi liên kết thành công!</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Hệ thống đã tự động gửi liên kết đặt lại mật khẩu đến email phụ huynh đã tạo của bạn:
                    </p>
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono font-bold text-xs p-2.5 rounded-xl inline-block">
                      {forgotResult.maskedEmail}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed pt-1">
                      Vui lòng mở hộp thư đến (hoặc kiểm tra thư mục <b>Spam / Thư rác</b>) và bấm vào liên kết trong email để đặt mật khẩu mới.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowForgotPassword(false)}
                    className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all text-sm mt-2"
                  >
                    Đã hiểu
                  </button>
                </div>
              ) : (
                <div className="space-y-4 py-1">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Hệ thống sẽ <b>tự động tra cứu và gửi liên kết đổi mật khẩu</b> tới địa chỉ email phụ huynh đã đăng ký. Bạn không cần phải nhớ hay gõ lại email.
                  </p>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Mã liên kết con hoặc Email của bạn
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Nhập mã ví dụ: P18342 hoặc email"
                        value={forgotInput}
                        onChange={e => setForgotInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            triggerResetPassword(forgotInput);
                          }
                        }}
                        className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                      />
                    </div>
                  </div>

                  {forgotResult?.type === 'error' && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-500" />
                      <span>{forgotResult.message}</span>
                    </div>
                  )}

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-all text-xs"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      disabled={!forgotInput.trim()}
                      onClick={() => triggerResetPassword(forgotInput)}
                      className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all text-xs shadow-md disabled:opacity-50"
                    >
                      Gửi liên kết
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
