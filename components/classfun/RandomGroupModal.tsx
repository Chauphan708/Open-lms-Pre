import React, { useState } from 'react';
import { X, Users, Settings2, Download, AlertTriangle } from 'lucide-react';
import { User } from '../../types';

interface Group {
    name: string;
    members: User[];
}

type GroupMode = 'BY_GROUPS' | 'BY_STUDENTS';
type Constraint = 'NONE' | 'MIXED' | 'MIN_1_FEMALE' | 'MIN_1_MALE' | 'SEGREGATE';

interface RandomGroupModalProps {
    students: User[];
    onClose: () => void;
}

export const RandomGroupModal: React.FC<RandomGroupModalProps> = ({ students, onClose }) => {
    const [mode, setMode] = useState<GroupMode>('BY_GROUPS');
    const [numberInput, setNumberInput] = useState<number>(4);
    const [constraint, setConstraint] = useState<Constraint>('NONE');
    const [groups, setGroups] = useState<Group[]>([]);
    const [errorMsg, setErrorMsg] = useState<string>('');

    const handleGenerate = () => {
        setErrorMsg('');
        if (students.length === 0) return;
        if (numberInput <= 0) {
            setErrorMsg('Vui lòng nhập số lớn hơn 0');
            return;
        }

        const shuffled = [...students].sort(() => Math.random() - 0.5);
        let groupCount = mode === 'BY_GROUPS' ? Math.min(numberInput, students.length) : Math.ceil(students.length / numberInput);

        const newGroups: Group[] = Array.from({ length: groupCount }, (_, i) => ({
            name: `Nhóm ${i + 1}`,
            members: []
        }));

        if (constraint === 'NONE') {
            // Default random distribution
            if (mode === 'BY_GROUPS') {
                shuffled.forEach((student, index) => {
                    newGroups[index % groupCount].members.push(student);
                });
            } else {
                for (let i = 0; i < groupCount; i++) {
                    const chunk = shuffled.slice(i * numberInput, (i + 1) * numberInput);
                    newGroups[i].members = chunk;
                }
            }
            setGroups(newGroups);
            return;
        }

        // Advanced Constraints
        let males = shuffled.filter(s => s.gender === 'MALE');
        let females = shuffled.filter(s => s.gender === 'FEMALE');
        let others = shuffled.filter(s => s.gender === 'OTHER' || !s.gender);

        if (constraint === 'SEGREGATE') {
            // Allocate separate groups for males, females, others
            // Let's recalculate group Count based on mode if necessary, or just fill sequentially
            const segGroups: Group[] = [];
            let gIndex = 1;

            const createHomogeneousGroups = (pool: User[], prefix: string) => {
                if (pool.length === 0) return;
                if (mode === 'BY_GROUPS') {
                    // It's ambiguous to divide by N groups if we are segregating.
                    // We will divide the pool into N proportional groups, or just N groups if possible.
                    const pCount = Math.min(numberInput, pool.length);
                    const groups: Group[] = Array.from({ length: pCount }, (_, i) => ({ name: `${prefix} ${i + 1}`, members: [] }));
                    pool.forEach((s, idx) => groups[idx % pCount].members.push(s));
                    segGroups.push(...groups.map(g => ({ ...g, name: `Nhóm ${gIndex++} (${prefix})` })));
                } else {
                    const pCount = Math.ceil(pool.length / numberInput);
                    for (let i = 0; i < pCount; i++) {
                        const chunk = pool.slice(i * numberInput, (i + 1) * numberInput);
                        segGroups.push({ name: `Nhóm ${gIndex++} (${prefix})`, members: chunk });
                    }
                }
            };

            createHomogeneousGroups(males, 'Nam');
            createHomogeneousGroups(females, 'Nữ');
            createHomogeneousGroups(others, 'Chưa rõ');

            setGroups(segGroups);
            return;
        }

        // For MIN requirements, we pre-fill.
        if (constraint === 'MIN_1_FEMALE' || constraint === 'MIXED') {
            if (females.length < groupCount) {
                setErrorMsg(`Không đủ học sinh Nữ (${females.length}) để chia đều vào ${groupCount} nhóm!`);
                return;
            }
            // Assign 1 female to each group
            for (let i = 0; i < groupCount; i++) {
                newGroups[i].members.push(females.pop()!);
            }
        }

        if (constraint === 'MIN_1_MALE' || constraint === 'MIXED') {
            if (males.length < groupCount) {
                setErrorMsg(`Không đủ học sinh Nam (${males.length}) để chia đều vào ${groupCount} nhóm!`);
                return;
            }
            // Assign 1 male to each group
            for (let i = 0; i < groupCount; i++) {
                newGroups[i].members.push(males.pop()!);
            }
        }

        // Distribute the rest
        const remaining = [...males, ...females, ...others].sort(() => Math.random() - 0.5);

        if (mode === 'BY_GROUPS') {
            let nextGroupIdx = 0;
            remaining.forEach((student) => {
                newGroups[nextGroupIdx].members.push(student);
                nextGroupIdx = (nextGroupIdx + 1) % groupCount;
            });
        } else {
            // BY_STUDENTS
            // Fill groups up to numberInput
            let targetGroup = 0;
            remaining.forEach((student) => {
                if (newGroups[targetGroup].members.length >= numberInput) {
                    targetGroup++;
                    if (targetGroup >= groupCount) {
                        // Create a new overflow group if needed, though Math.ceil should cover it
                        targetGroup = 0;
                    }
                }
                if (!newGroups[targetGroup]) {
                    newGroups[targetGroup] = { name: `Nhóm ${targetGroup + 1}`, members: [] };
                }
                newGroups[targetGroup].members.push(student);
            });
        }

        setGroups(newGroups);
    };

    const handleExport = () => {
        let text = "KẾT QUẢ CHIA NHÓM\n\n";
        groups.forEach(g => {
            text += `--- ${g.name} ---\n`;
            g.members.forEach((m, idx) => {
                let genderStr = '';
                if (m.gender === 'MALE') genderStr = ' - Nam';
                if (m.gender === 'FEMALE') genderStr = ' - Nữ';
                text += `${idx + 1}. ${m.name}${genderStr}\n`;
            });
            text += '\n';
        });

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Danh_Sach_Nhom_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const unknownCount = students.filter(s => s.gender === 'OTHER' || !s.gender).length;

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-0 md:p-4">
            <div className="bg-white rounded-none md:rounded-2xl shadow-xl w-full h-full md:max-w-6xl md:h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                        <Users className="h-6 w-6" /> Chia Nhóm Ngẫu Nhiên
                    </h2>
                    <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-full transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 flex flex-col md:flex-row gap-6 flex-1 overflow-hidden">
                    {/* Settings Panel */}
                    <div className="md:w-1/3 flex flex-col gap-4 border-b md:border-b-0 md:border-r pb-4 md:pb-0 md:pr-6 border-gray-200 overflow-y-auto custom-scrollbar">
                        <h3 className="font-bold flex items-center gap-2 text-gray-800">
                            <Settings2 className="h-5 w-5 text-indigo-500" /> Tùy chọn chia
                        </h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-xl hover:bg-gray-50 transition-colors">
                                    <input
                                        type="radio"
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                        checked={mode === 'BY_GROUPS'}
                                        onChange={() => { setMode('BY_GROUPS'); setNumberInput(4); }}
                                    />
                                    <span className="font-medium text-gray-700">Chia theo số nhóm</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-xl hover:bg-gray-50 transition-colors">
                                    <input
                                        type="radio"
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                        checked={mode === 'BY_STUDENTS'}
                                        onChange={() => { setMode('BY_STUDENTS'); setNumberInput(5); }}
                                    />
                                    <span className="font-medium text-gray-700">Chia theo số lượng HS</span>
                                </label>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl space-y-2 border">
                                <label className="text-sm font-bold text-gray-700 block text-center">
                                    {mode === 'BY_GROUPS' ? 'Số lượng nhóm cần chia:' : 'Số lượng HS mỗi nhóm:'}
                                </label>
                                <div className="flex justify-center items-center gap-4">
                                    <button onClick={() => setNumberInput(Math.max(1, numberInput - 1))} className="w-10 h-10 rounded-full bg-white border shadow-sm flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100">-</button>
                                    <span className="text-2xl font-bold text-indigo-700 w-12 text-center">{numberInput}</span>
                                    <button onClick={() => setNumberInput(numberInput + 1)} className="w-10 h-10 rounded-full bg-white border shadow-sm flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100">+</button>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Điều kiện nâng cao (Giới tính)</label>
                                <select
                                    className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 text-sm"
                                    value={constraint}
                                    onChange={e => setConstraint(e.target.value as Constraint)}
                                >
                                    <option value="NONE">Ngẫu nhiên hoàn toàn</option>
                                    <option value="MIXED">Có cả Nam & Nữ trong mỗi nhóm</option>
                                    <option value="MIN_1_FEMALE">Ít nhất 1 Nữ trong mỗi nhóm</option>
                                    <option value="MIN_1_MALE">Ít nhất 1 Nam trong mỗi nhóm</option>
                                    <option value="SEGREGATE">Tách riêng nhóm nhóm Nam và nhóm Nữ</option>
                                </select>
                            </div>

                            {unknownCount > 0 && constraint !== 'NONE' && (
                                <div className="bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-200 text-xs flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <p>Có <b>{unknownCount}</b> học sinh chưa cập nhật giới tính. Sẽ được xếp ngẫu nhiên.</p>
                                </div>
                            )}

                            {errorMsg && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg border border-red-200 text-sm font-medium">
                                    {errorMsg}
                                </div>
                            )}

                            <div className="text-sm text-center text-gray-500 italic pb-2">
                                Danh sách hiện có: <b>{students.length}</b> học sinh
                            </div>

                            <button
                                onClick={handleGenerate}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-md active:scale-95 shrink-0"
                            >
                                Thực hiện chia nhóm
                            </button>
                        </div>
                    </div>

                    {/* Results Panel */}
                    <div className="md:w-2/3 flex flex-col h-full overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800">Kết quả ({groups.length} nhóm)</h3>
                            {groups.length > 0 && (
                                <button onClick={handleExport} className="text-sm flex items-center gap-1 text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 font-medium transition">
                                    <Download className="h-4 w-4" /> Xuất file txt
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 pb-4 custom-scrollbar">
                            {groups.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3 min-h-[200px] border-2 border-dashed rounded-xl">
                                    <Users className="h-10 w-10 opacity-50" />
                                    <p>Chưa có kết quả. Vui lòng thiết lập và nhấn "Thực hiện chia nhóm".</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {groups.map((group, idx) => (
                                        <div key={idx} className="bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
                                            <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                                                <span className="font-bold text-indigo-700">{group.name}</span>
                                                <span className="text-xs bg-white border px-2 py-0.5 rounded-full font-bold text-gray-500 shrink-0">{group.members.length} HS</span>
                                            </div>
                                            <div className="p-3 overflow-y-auto custom-scrollbar text-sm space-y-2 flex-1">
                                                {group.members.map((m, i) => (
                                                    <div key={m.id} className="flex gap-2 items-center text-gray-700">
                                                        <span className="text-xs text-gray-400 w-4 text-right shrink-0">{i + 1}.</span>
                                                        <span className="font-medium truncate flex-1" title={m.name}>{m.name}</span>
                                                        {m.gender === 'MALE' && <span className="text-xs font-bold text-blue-500 bg-blue-50 px-1 rounded">Nam</span>}
                                                        {m.gender === 'FEMALE' && <span className="text-xs font-bold text-pink-500 bg-pink-50 px-1 rounded">Nữ</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
