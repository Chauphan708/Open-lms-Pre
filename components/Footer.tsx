
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Facebook, 
  Phone, 
  Mail, 
  MapPin,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useStore } from '../store';


interface FooterProps {
  isSidebarCollapsed?: boolean;
}

const Footer: React.FC<FooterProps> = ({ isSidebarCollapsed = false }) => {
  const { siteSettings } = useStore();
  const [isExpanded, setIsExpanded] = React.useState(() => {
    // Default to collapsed on mobile, expanded on desktop
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('footer_expanded');
      if (saved !== null) return saved === 'true';
      return window.innerWidth >= 768;
    }
    return true;
  });

  const toggleFooter = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem('footer_expanded', String(newState));
  };

  const currentYear = new Date().getFullYear();

  // Fallback defaults if siteSettings is null
  const slogan = siteSettings?.slogan || "Nâng tầm giáo dục số Việt Nam";
  const hotline = siteSettings?.hotline || "1900 xxxx";
  const email = siteSettings?.email || "support@openlms.vn";
  const facebook = siteSettings?.facebook || "#";
  const zalo = siteSettings?.zalo || "#";
  const address = siteSettings?.address || "TP. Cần Thơ, Việt Nam";

  return (
    <footer className={`
      fixed bottom-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]
      transition-all duration-300 ease-in-out
      ${isSidebarCollapsed ? 'left-0 md:left-20' : 'left-0 md:left-64'}
      ${isExpanded ? 'h-auto py-4' : 'h-10 py-0'}
    `}>
      {/* Toggle Button */}
      <button 
        onClick={toggleFooter}
        className="absolute -top-10 right-4 bg-white/90 backdrop-blur-md p-2 rounded-t-xl border-t border-l border-r shadow-[-2px_-2px_5px_rgba(0,0,0,0.05)] text-indigo-600 hover:text-indigo-700 transition-all md:hidden"
        title={isExpanded ? "Thu gọn" : "Mở rộng"}
      >
        {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5 animate-bounce" />}
      </button>

      <div className={`max-w-7xl mx-auto px-4 transition-all duration-300 ${isExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none h-0'}`}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Brand & Slogan */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2 font-bold text-xl text-indigo-600">
              <div className="bg-indigo-600 p-1 rounded-lg">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="tracking-tight">OpenLMS</span>
            </div>
            <div className="h-4 w-px bg-gray-200 hidden md:block"></div>
            <p className="text-gray-500 text-xs font-medium italic">
              "{slogan}"
            </p>
          </div>

          {/* Contact Info (Compact) */}
          <div className="flex flex-wrap justify-center gap-6">
            <div className="flex items-center gap-2 group">
              <Phone className="h-4 w-4 text-indigo-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-gray-700">{hotline}</span>
            </div>
            <div className="flex items-center gap-2 group">
              <Mail className="h-4 w-4 text-indigo-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-gray-700">{email}</span>
            </div>
            <div className="flex items-center gap-2 group">
              <MapPin className="h-4 w-4 text-indigo-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-gray-700 line-clamp-1 max-w-[200px]">{address}</span>
            </div>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-3">
             <a 
                href={facebook} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-gray-50 text-gray-400 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a 
                href={zalo} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-full bg-gray-50 text-gray-400 hover:bg-indigo-600 hover:text-white transition-all shadow-sm font-bold text-[10px]"
              >
                Zalo
              </a>
          </div>
        </div>

        {/* Bottom Bar (Ultra Compact) */}
        <div className="mt-4 pt-4 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-gray-400 font-medium">
          <p>© {currentYear} OpenLMS. Tất cả quyền lợi được bảo lưu.</p>
          <div className="flex gap-4">
            <Link to="#" className="hover:text-indigo-600">Bảo mật</Link>
            <Link to="#" className="hover:text-indigo-600">Điều khoản</Link>
            <Link to="#" className="hover:text-indigo-600">Trợ giúp</Link>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-600 rounded-full border border-green-100">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            <span>Ổn định</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
