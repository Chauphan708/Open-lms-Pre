
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { WebResource } from '../types';
import { Globe, Plus, Trash2, ExternalLink, Layout, X, PlayCircle, AlertTriangle, Loader2, Search, Filter, SortAsc, BookOpen } from 'lucide-react';

export const ResourceLibrary: React.FC = () => {
    const { resources, addResource, deleteResource, user, fetchResources } = useStore();

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);
    const [isAdding, setIsAdding] = useState(false);
    const [viewingResource, setViewingResource] = useState<WebResource | null>(null);
    const [isSaving, setIsSaving] = useState(false); // Loading state for save

    // Form State
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [type, setType] = useState<'LINK' | 'EMBED'>('LINK');
    const [topic, setTopic] = useState('Chung');
    const [customTopic, setCustomTopic] = useState('');
    const [description, setDescription] = useState('');

    // Filter & Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('All');
    const [selectedType, setSelectedType] = useState<'All' | 'LINK' | 'EMBED'>('All');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'az'>('newest');

    // Derived Data
    const uniqueTopics = useMemo(() => {
        const topics = new Set(resources.map(r => r.topic || 'Chung'));
        return ['All', ...Array.from(topics)];
    }, [resources]);

    const filteredResources = useMemo(() => {
        return resources.filter(res => {
            const matchesSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (res.description || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesTopic = selectedTopic === 'All' || (res.topic || 'Chung') === selectedTopic;
            const matchesType = selectedType === 'All' || res.type === selectedType;
            return matchesSearch && matchesTopic && matchesType;
        }).sort((a, b) => {
            if (sortOrder === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (sortOrder === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            return a.title.localeCompare(b.title);
        });
    }, [resources, searchTerm, selectedTopic, selectedType, sortOrder]);

    const handleAdd = async () => {
        if (!title || !url) return;
        setIsSaving(true);

        // Simple URL validation
        let validUrl = url.trim();
        if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
            validUrl = `https://${validUrl}`;
        }

        // Auto-convert YouTube Watch URL to Embed URL
        if (type === 'EMBED') {
            // Support: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
            const ytMatch = validUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&?/]+)/);
            if (ytMatch && ytMatch[1]) {
                validUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
            }
        }

        const finalTopic = topic === 'Other' && customTopic.trim() !== '' ? customTopic.trim() : topic;

        const newRes: WebResource = {
            id: `res_${Date.now()}`,
            title: title.trim(),
            url: validUrl,
            type,
            topic: finalTopic, // Use the resolved topic
            description: description.trim(),
            addedBy: user?.id || 'unknown',
            createdAt: new Date().toISOString()
        };

        const success = await addResource(newRes);
        setIsSaving(false);

        if (success) {
            setIsAdding(false);
            resetForm();
        } else {
            alert("Lỗi khi lưu tài liệu. Vui lòng đảm bảo bảng 'resources' đã được cập nhật.");
        }
    };

    const resetForm = () => {
        setTitle('');
        setUrl('');
        setType('LINK');
        setTopic('Chung');
        setCustomTopic('');
        setDescription('');
    };

    const handleDelete = async (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa tài liệu này? Hành động này không thể hoàn tác.')) {
            const success = await deleteResource(id);
            if (!success) {
                alert("Lỗi khi xóa tài liệu.");
            }
        }
    };

    const canManage = user?.role === 'TEACHER' || user?.role === 'ADMIN';

    // Predefined topics for suggestion
    const SUGGESTED_TOPICS = ['Chung', 'Toán Học', 'Vật Lý', 'Hóa Học', 'Sinh Học', 'Văn Học', 'Tiếng Anh', 'Tin Học'];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Globe className="text-indigo-600" /> Kho Tài Liệu & Web
                    </h1>
                    <p className="text-gray-500 mt-1">Lưu trữ, tổ chức và chia sẻ các nguồn học liệu số.</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold hover:bg-indigo-700 shadow-md transition-transform hover:scale-105"
                    >
                        <Plus className="h-5 w-5" /> Thêm tài liệu
                    </button>
                )}
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                        className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Tìm kiếm tài liệu..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border whitespace-nowrap">
                        <Filter className="h-4 w-4 text-gray-500" />
                        <select
                            className="bg-transparent outline-none text-sm font-medium text-gray-700 cursor-pointer"
                            value={selectedTopic}
                            onChange={e => setSelectedTopic(e.target.value)}
                        >
                            {uniqueTopics.map(t => <option key={t} value={t}>{t === 'All' ? 'Tất cả chủ đề' : t}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border whitespace-nowrap">
                        <Layout className="h-4 w-4 text-gray-500" />
                        <select
                            className="bg-transparent outline-none text-sm font-medium text-gray-700 cursor-pointer"
                            value={selectedType}
                            onChange={e => setSelectedType(e.target.value as any)}
                        >
                            <option value="All">Tất cả loại</option>
                            <option value="LINK">Link (Mở tab mới)</option>
                            <option value="EMBED">Embed (Nhúng)</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border whitespace-nowrap">
                        <SortAsc className="h-4 w-4 text-gray-500" />
                        <select
                            className="bg-transparent outline-none text-sm font-medium text-gray-700 cursor-pointer"
                            value={sortOrder}
                            onChange={e => setSortOrder(e.target.value as any)}
                        >
                            <option value="newest">Mới nhất</option>
                            <option value="oldest">Cũ nhất</option>
                            <option value="az">A-Z</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Add Modal */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-xl text-gray-900">Thêm tài liệu mới</h3>
                            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full hover:bg-gray-200 transition-colors"><X className="h-5 w-5" /></button>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Tiêu đề <span className="text-red-500">*</span></label>
                                <input className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: PhET Mô phỏng vật lý" autoFocus />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Chủ đề / Môn học</label>
                                <div className="flex gap-2 mb-2 flex-wrap">
                                    {SUGGESTED_TOPICS.map(t => (
                                        <button
                                            key={t}
                                            onClick={() => { setTopic(t); setCustomTopic(''); }}
                                            className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${topic === t ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setTopic('Other')}
                                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${topic === 'Other' ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        Khác...
                                    </button>
                                </div>
                                {topic === 'Other' && (
                                    <input
                                        className="w-full border border-indigo-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50/50"
                                        value={customTopic}
                                        onChange={e => setCustomTopic(e.target.value)}
                                        placeholder="Nhập tên chủ đề mới..."
                                    />
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Đường dẫn (URL) <span className="text-red-500">*</span></label>
                                <input className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <label className={`cursor-pointer border-2 p-3 rounded-xl flex flex-col items-center gap-2 text-sm transition-all ${type === 'LINK' ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-200 ring-offset-1' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-gray-300'}`}>
                                    <input type="radio" name="type" className="hidden" checked={type === 'LINK'} onChange={() => setType('LINK')} />
                                    <ExternalLink className="h-6 w-6" />
                                    <span className="font-bold">Mở Tab Mới</span>
                                    <span className="text-[10px] text-center font-normal opacity-75">An toàn nhất. Dùng cho Google, Facebook, báo chí...</span>
                                </label>
                                <label className={`cursor-pointer border-2 p-3 rounded-xl flex flex-col items-center gap-2 text-sm transition-all ${type === 'EMBED' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-200 ring-offset-1' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-gray-300'}`}>
                                    <input type="radio" name="type" className="hidden" checked={type === 'EMBED'} onChange={() => setType('EMBED')} />
                                    <Layout className="h-6 w-6" />
                                    <span className="font-bold">Nhúng vào App</span>
                                    <span className="text-[10px] text-center font-normal opacity-75">Chỉ dùng cho YouTube, Vimeo, PhET, Wikipedia...</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Mô tả ngắn</label>
                                <textarea className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none" value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả nội dung tài liệu..." />
                            </div>
                        </div>

                        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setIsAdding(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-200 rounded-xl font-bold transition-colors">Hủy bỏ</button>
                            <button
                                onClick={handleAdd}
                                disabled={isSaving || !title || !url}
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Lưu Tài Liệu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Resource Modal (Embed) */}
            {viewingResource && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2 md:p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
                        <div className="bg-indigo-900 text-white p-3 px-4 flex justify-between items-center shadow-md z-10">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <h3 className="font-bold text-lg truncate">{viewingResource.title}</h3>
                                <span className="hidden md:inline-block px-2 py-0.5 bg-white/20 rounded text-xs">
                                    {viewingResource.topic || 'Chung'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        let finalUrl = viewingResource.url;
                                        if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
                                            finalUrl = 'https://' + finalUrl;
                                        }
                                        window.open(finalUrl, '_blank', 'noopener,noreferrer');
                                    }}
                                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer border-none"
                                    type="button"
                                >
                                    <ExternalLink className="h-4 w-4" /> <span className="hidden sm:inline">Mở trang gốc</span>
                                </button>
                                <button onClick={() => setViewingResource(null)} className="p-2 hover:bg-red-500/20 rounded-full text-white/80 hover:text-white transition-colors">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-gray-100 relative group">
                            <iframe
                                src={viewingResource.url}
                                className="w-full h-full border-none"
                                title={viewingResource.title}
                                allowFullScreen
                                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
                            />

                            {/* Only show this warning initially or on hover area at top */}
                            <div className="absolute top-0 left-0 w-full p-2 bg-yellow-100 text-yellow-800 text-xs text-center border-b border-yellow-200 opacity-90 hover:opacity-100 transition-opacity">
                                <AlertTriangle className="h-4 w-4 inline mr-1.5 mb-0.5" />
                                Nếu màn hình trắng, trang web đã chặn hiển thị. Vui lòng nhấn nút <b>"Mở trang gốc"</b> ở góc trên bên phải.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Resources Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredResources.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                        <div className="bg-gray-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                            <Search className="h-10 w-10 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Không tìm thấy tài liệu nào</h3>
                        <p className="text-gray-500">Thử thay đổi bộ lọc hoặc thêm tài liệu mới.</p>
                    </div>
                )}

                {filteredResources.map(res => (
                    <div key={res.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all group flex flex-col overflow-hidden h-full">
                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${res.type === 'EMBED' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {res.type === 'EMBED' ? <PlayCircle className="h-6 w-6" /> : <ExternalLink className="h-6 w-6" />}
                                </div>
                                {res.topic && (
                                    <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg truncate max-w-[100px]">
                                        {res.topic}
                                    </span>
                                )}
                            </div>

                            <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                                {res.title}
                            </h3>
                            <p className="text-sm text-gray-500 line-clamp-3 mb-4 flex-1">
                                {res.description || 'Không có mô tả chi tiết.'}
                            </p>

                            <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-dashed mt-auto">
                                <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {new Date(res.createdAt).toLocaleDateString('vi-VN')}</span>
                                {canManage && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(res.id); }} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors flex items-center gap-1" title="Xóa">
                                        <Trash2 className="h-4 w-4" /> <span className="font-bold">Xóa</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-3 bg-gray-50">
                            {res.type === 'EMBED' ? (
                                <button
                                    onClick={() => setViewingResource(res)}
                                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 active:scale-95 transition-all shadow-indigo-200 shadow-sm"
                                >
                                    <PlayCircle className="h-4 w-4" /> Xem ngay
                                </button>
                            ) : (
                                <a
                                    href={res.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-100 hover:text-indigo-600 active:scale-95 transition-all"
                                >
                                    <ExternalLink className="h-4 w-4" /> Mở trang web
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
