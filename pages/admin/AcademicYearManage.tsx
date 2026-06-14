import React, { useState } from 'react';
import { useStore } from '../../store';
import { AcademicYear } from '../../types';
import { CalendarRange, Plus, Save } from 'lucide-react';

export const AcademicYearManage: React.FC = () => {
  const { academicYears, addAcademicYear } = useStore();
  const [isCreating, setIsCreating] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [sem1Start, setSem1Start] = useState('');
  const [sem1End, setSem1End] = useState('');
  const [sem2Start, setSem2Start] = useState('');
  const [sem2End, setSem2End] = useState('');

  const handleCreate = () => {
    if (!name || !sem1Start || !sem1End) return;

    const newYear: AcademicYear = {
      id: `ay_${Date.now()}`,
      name,
      isActive: false, // Default inactive
      semesters: [
        { id: `s1_${Date.now()}`, name: 'Học kì 1', startDate: sem1Start, endDate: sem1End },
        { id: `s2_${Date.now()}`, name: 'Học kì 2', startDate: sem2Start, endDate: sem2End },
      ]
    };
    
    addAcademicYear(newYear);
    setIsCreating(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setSem1Start('');
    setSem1End('');
    setSem2Start('');
    setSem2End('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarRange /> Quản lý Năm Học
        </h1>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Thêm Năm Học
        </button>
      </div>

      {isCreating && (
        <div className="bg-white p-6 rounded-xl border shadow-sm animate-fade-in">
          <h3 className="font-bold text-gray-800 mb-4">Thêm mới năm học</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Tên năm học</label>
               <input 
                 className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500" 
                 placeholder="VD: 2024-2025"
                 value={name} onChange={e => setName(e.target.value)}
                />
             </div>
             <div></div>
             
             <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                <p className="font-bold text-sm mb-2 text-indigo-700">Học kì 1</p>
                <div className="flex gap-2">
                  <input type="date" className="border border-gray-300 p-2 rounded w-full bg-white text-gray-900" value={sem1Start} onChange={e => setSem1Start(e.target.value)} />
                  <span className="self-center text-gray-500">-</span>
                  <input type="date" className="border border-gray-300 p-2 rounded w-full bg-white text-gray-900" value={sem1End} onChange={e => setSem1End(e.target.value)} />
                </div>
             </div>

             <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                <p className="font-bold text-sm mb-2 text-indigo-700">Học kì 2</p>
                <div className="flex gap-2">
                  <input type="date" className="border border-gray-300 p-2 rounded w-full bg-white text-gray-900" value={sem2Start} onChange={e => setSem2Start(e.target.value)} />
                  <span className="self-center text-gray-500">-</span>
                  <input type="date" className="border border-gray-300 p-2 rounded w-full bg-white text-gray-900" value={sem2End} onChange={e => setSem2End(e.target.value)} />
                </div>
             </div>
          </div>
          <div className="mt-4 flex gap-2 justify-end">
            <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Hủy</button>
            <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 font-bold shadow-sm hover:bg-indigo-700">
              <Save className="h-4 w-4" /> Lưu Năm Học
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-500">
          <thead className="bg-gray-50 text-gray-700 uppercase">
            <tr>
              <th className="px-6 py-3">Tên năm học</th>
              <th className="px-6 py-3">Trạng thái</th>
              <th className="px-6 py-3">HK1</th>
              <th className="px-6 py-3">HK2</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {academicYears.map(year => (
              <tr key={year.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{year.name}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${year.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {year.isActive ? 'Đang diễn ra' : 'Đã kết thúc'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {year.semesters[0]?.startDate} đến {year.semesters[0]?.endDate}
                </td>
                <td className="px-6 py-4">
                  {year.semesters[1]?.startDate} đến {year.semesters[1]?.endDate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};