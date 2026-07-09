import React from 'react';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Facebook, 
  Phone, 
  Mail
} from 'lucide-react';
import { useStore } from '../store';

interface FooterProps {
  isSidebarCollapsed?: boolean;
}

const Footer: React.FC<FooterProps> = () => {
  const { siteSettings } = useStore();
  const currentYear = new Date().getFullYear();

  // Fallback defaults if siteSettings is null
  const hotline = siteSettings?.hotline || "1900 xxxx";
  const email = siteSettings?.email || "support@openlms.vn";
  const facebook = siteSettings?.facebook || "#";
  const zalo = siteSettings?.zalo || "#";

  return (
    <footer className="w-full mt-auto bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800/80 py-4 px-6 md:px-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Copyright */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1 text-xs text-gray-400 dark:text-slate-500">
          <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
            <GraduationCap className="h-4 w-4" />
            <span className="tracking-tight">OpenLMS</span>
          </div>
          <span className="hidden md:inline text-gray-200 dark:text-slate-800">|</span>
          <p className="font-medium">© {currentYear} OpenLMS. Tất cả quyền lợi được bảo lưu.</p>
        </div>

        {/* Contact Info (Very Compact) */}
        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-[11px] text-gray-550 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-semibold">
            <Phone className="h-3 w-3 text-indigo-500/80 dark:text-indigo-400/80" />
            <span>{hotline}</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold">
            <Mail className="h-3 w-3 text-indigo-500/80 dark:text-indigo-400/80" />
            <span>{email}</span>
          </div>
        </div>

        {/* Links, Status & Social */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold">
          <div className="flex gap-3 text-gray-400 dark:text-slate-500 text-[11px]">
            <Link to="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Bảo mật</Link>
            <Link to="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Điều khoản</Link>
            <Link to="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Trợ giúp</Link>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-full border border-green-100 dark:border-green-900/20 text-[10px]">
            <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
            <span>Ổn định</span>
          </div>

          <div className="flex items-center gap-2">
            <a 
              href={facebook} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-1 rounded-full text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Facebook className="h-3.5 w-3.5" />
            </a>
            <a 
              href={zalo} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-2 py-0.5 rounded-full bg-gray-50 dark:bg-slate-800/80 text-gray-400 dark:text-slate-500 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 transition-all font-bold text-[9px]"
            >
              Zalo
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
