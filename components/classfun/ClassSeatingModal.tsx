import React, { useState, useEffect, useMemo } from 'react';
import { useClassFunStore } from '../../services/classFunStore';
import { User, ClassSeat } from '../../types';
import { generateSeatingChart } from '../../services/geminiService';
import { X, Users, RotateCcw, Save, LayoutGrid, AlertCircle, Wand2, CheckSquare } from 'lucide-react';

interface ClassSeatingModalProps {
    classId: string;
    students: User[];
    onClose: () => void;
}

export const ClassSeatingModal: React.FC<ClassSeatingModalProps> = ({ classId, students, onClose }) => {
    const { seatingChart, fetchSeatingChart, saveSeatingChart } = useClassFunStore();
    const [rows, setRows] = useState(5);
    const [cols, setCols] = useState(5);
    const [seats, setSeats] = useState<ClassSeat[]>([]);
    const [selectedSeat, setSelectedSeat] = useState<ClassSeat | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // Load existing chart
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            await fetchSeatingChart(classId);
            setIsLoading(false);
        };
        load();
    }, [classId, fetchSeatingChart]);

    // Sync state when chart loaded
    useEffect(() => {
        if (seatingChart) {
            setRows(seatingChart.rows);
            setCols(seatingChart.columns);
            setSeats(seatingChart.seats);
        } else {
            // Init empty seats
            initEmptySeats(5, 5);
        }
    }, [seatingChart]);

    const initEmptySeats = (r: number, c: number) => {
        const newSeats: ClassSeat[] = [];
        for (let i = 0; i < r; i++) {
            for (let j = 0; j < c; j++) {
                newSeats.push({ row: i, col: j, studentId: null });
            }
        }
        setSeats(newSeats);
        setRows(r);
        setCols(c);
    }

    // Handle grid change
    const handleGridChange = () => {
        if (students.length > rows * cols) {
            alert(`Lưới ${rows}x${cols} (${rows * cols} chỗ) không đủ cho ${students.length} học sinh. Vui lòng tăng kích thước.`);
            return;
        }

        if (window.confirm('Thay đổi kích thước lưới sẽ xóa toàn bộ sơ đồ hiện tại. Bạn có chắc chắn?')) {
            initEmptySeats(rows, cols);
        }
    }

    // Calculate unassigned students
    const unassignedStudents = useMemo(() => {
        const assignedIds = new Set(seats.map(s => s.studentId).filter(Boolean));
        return students.filter(s => !assignedIds.has(s.id));
    }, [students, seats]);


    // Actions
    const handleSeatClick = (seat: ClassSeat) => {
        if (!selectedSeat) {
            // First click
            setSelectedSeat(seat);
        } else {
            // Second click: swap
            if (selectedSeat.row === seat.row && selectedSeat.col === seat.col) {
                setSelectedSeat(null); // deselect
                return;
            }

            const newSeats = [...seats];

            const idx1 = newSeats.findIndex(s => s.row === selectedSeat.row && s.col === selectedSeat.col);
            const idx2 = newSeats.findIndex(s => s.row === seat.row && s.col === seat.col);

            // Swap studentId
            const tempId = newSeats[idx1].studentId;
            newSeats[idx1].studentId = newSeats[idx2].studentId;
            newSeats[idx2].studentId = tempId;

            setSeats(newSeats);
            setSelectedSeat(null);
        }
    };

    const assignStudentToSeat = (studentId: string) => {
        if (!selectedSeat) return;

        const newSeats = [...seats];
        const idx = newSeats.findIndex(s => s.row === selectedSeat.row && s.col === selectedSeat.col);

        // If student is already somewhere else, remove them first
        const existingIdx = newSeats.findIndex(s => s.studentId === studentId);
        if (existingIdx !== -1) {
            newSeats[existingIdx].studentId = null;
        }

        newSeats[idx].studentId = studentId;
        setSeats(newSeats);
        setSelectedSeat(null);
    }


    const handleRandomize = () => {
        if (window.confirm('Bạn có chắc muốn xếp lại ngẫu nhiên toàn bộ chỗ ngồi?')) {
            const newSeats = [...seats].map(s => ({ ...s, studentId: null as string | null })); // Clear all

            let availableSeats = [...newSeats];

            // Shuffle students
            const shuffledStudents = [...students].sort(() => 0.5 - Math.random());

            shuffledStudents.forEach(student => {
                if (availableSeats.length === 0) return;
                // Pick a random seat
                const randIdx = Math.floor(Math.random() * availableSeats.length);
                const chosenSeat = availableSeats[randIdx];

                // Assign
                const realIdx = newSeats.findIndex(s => s.row === chosenSeat.row && s.col === chosenSeat.col);
                if (realIdx !== -1) {
                    newSeats[realIdx].studentId = student.id as string | null;
                }

                // Remove from available
                availableSeats.splice(randIdx, 1);
            });

            setSeats(newSeats);
            setSelectedSeat(null);
        }
    }

    const handleAIArrange = async () => {
        if (!window.confirm('Bạn muốn AI phân tích và xếp chỗ tự động (tối ưu hóa ngẫu nhiên và xen kẽ giới tính)? Thời gian xử lý có thể mất vài giây.')) return;

        setIsGeneratingAI(true);
        try {
            const chart = await generateSeatingChart(
                students.map(s => ({ id: s.id, name: s.name, gender: s.gender })),
                rows,
                cols,
                "Hãy xếp chỗ cẩn thận, cân bằng. Học sinh nữ ưu tiên ngồi các hàng đầu tiên hơn."
            );

            // Re-map to preserve any metadata if needed, clear remaining seats
            const newSeats = [...seats].map(s => ({ ...s, studentId: null as string | null }));
            chart.forEach(seat => {
                const realIdx = newSeats.findIndex(s => s.row === seat.row && s.col === seat.col);
                if (realIdx !== -1) {
                    newSeats[realIdx].studentId = seat.studentId;
                }
            });

            setSeats(newSeats);
            setSelectedSeat(null);
        } catch (error: any) {
            alert(error.message || 'Có lỗi xảy ra khi dùng AI xếp chỗ.');
        } finally {
            setIsGeneratingAI(false);
        }
    }

    const handleSave = async () => {
        setIsSaving(true);
        await saveSeatingChart({
            classId,
            rows,
            columns: cols,
            seats
        });
        setIsSaving(false);
        onClose();
    }


    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
                    <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium">Đang tải cấu hình chỗ ngồi...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
            <div className="bg-white rounded-2xl w-full max-w-6xl h-[95vh] flex flex-col shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <LayoutGrid className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Sơ đồ Lớp Học</h2>
                            <p className="text-indigo-100 text-sm opacity-90">Kéo thả hoặc nhấn để sắp xếp chỗ ngồi</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-gray-50 min-h-[400px]">

                    {/* Sidebar Controls & Unassigned */}
                    <div className="w-full md:w-80 bg-white border-r flex flex-col h-full overflow-hidden shadow-sm z-10 shrink-0">
                        <div className="p-4 border-b border-gray-100 space-y-4">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <LayoutGrid className="h-4 w-4 text-indigo-500" /> Cấu hình Lưới
                            </h3>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-500 font-semibold mb-1">Số hàng ngang</label>
                                    <input type="number" min="1" max="15" value={rows} onChange={e => setRows(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-500 font-semibold mb-1">Số cột dọc</label>
                                    <input type="number" min="1" max="15" value={cols} onChange={e => setCols(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>
                            <button onClick={handleGridChange} className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition">
                                Cập nhật lưới
                            </button>

                            <div className="h-px bg-gray-100 w-full my-4"></div>

                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={handleRandomize} disabled={isGeneratingAI} className="flex items-center justify-center gap-2 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-lg text-sm transition disabled:opacity-50">
                                    <RotateCcw className="h-4 w-4" /> Ngẫu nhiên
                                </button>
                                <button onClick={handleAIArrange} disabled={isGeneratingAI} className="flex items-center justify-center gap-2 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold rounded-lg text-sm transition tooltip disabled:opacity-50" title="AI xếp chỗ thông minh">
                                    {isGeneratingAI ? <div className="w-4 h-4 border-2 border-purple-700 border-t-transparent rounded-full animate-spin"></div> : <Wand2 className="h-4 w-4" />}
                                    AI Tự động
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            <h3 className="font-bold text-gray-800 flex items-center justify-between mb-3">
                                <span className="flex items-center gap-2"><Users className="h-4 w-4 text-amber-500" /> Chưa xếp chỗ</span>
                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-xs">{unassignedStudents.length}</span>
                            </h3>

                            {unassignedStudents.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <CheckSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Đã xếp hết học sinh</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {unassignedStudents.map(s => (
                                        <div
                                            key={s.id}
                                            onClick={() => assignStudentToSeat(s.id)}
                                            className={`p-3 rounded-lg border text-sm flex items-center gap-3 cursor-pointer transition-all
                                        ${selectedSeat ? 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100' : 'bg-white hover:border-gray-300 hover:shadow-sm'}
                                    `}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                                {s.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-semibold text-gray-700 flex-1 truncate">{s.name}</span>
                                            {selectedSeat && <span className="text-xs text-indigo-500 bg-white px-2 py-1 rounded-full shadow-sm">Gắn vào ghế</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Grid Area */}
                    <div className="flex-1 p-6 flex flex-col items-center justify-start overflow-auto relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] resize-x min-w-[300px]" style={{ resize: 'horizontal', overflow: 'auto' }}>
                        {/* Teacher Desk indicator */}
                        <div className="sticky top-0 bg-gray-800 text-white px-12 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 mb-8 mt-4 z-30 mx-auto w-max shrink-0">
                            BÀN GIÁO VIÊN
                        </div>

                        <div
                            className="grid gap-2 sm:gap-3 px-2 sm:px-4 pb-8 mx-auto w-full max-w-4xl"
                            style={{
                                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
                            }}
                        >
                            {seats.map((seat, idx) => {
                                const student = students.find(s => s.id === seat.studentId);
                                const isSelected = selectedSeat?.row === seat.row && selectedSeat?.col === seat.col;
                                
                                // Dynamic sizing based on columns
                                const isCompact = cols >= 8;
                                const avatarSize = isCompact 
                                    ? 'w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8' 
                                    : 'w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12';
                                const textSize = isCompact
                                    ? 'text-[7px] sm:text-[9px] md:text-xs'
                                    : 'text-[9px] sm:text-xs md:text-sm';

                                return (
                                    <div
                                        key={`${seat.row}-${seat.col}`}
                                        onClick={() => handleSeatClick(seat)}
                                        className={`
                                    relative w-full rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 p-0.5 sm:p-1 overflow-hidden
                                    ${isCompact ? 'aspect-[4/5] min-h-[60px]' : 'aspect-square min-h-[70px]'}
                                    ${isSelected ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-500/20 scale-105 shadow-xl z-20' : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md'}
                                `}
                                    >
                                        <span className={`absolute top-0.5 left-1 text-gray-400 font-medium ${isCompact ? 'text-[6px] sm:text-[8px]' : 'text-[8px] sm:text-[10px]'}`}>
                                            H{seat.row + 1}-C{seat.col + 1}
                                        </span>

                                        {student ? (
                                            <>
                                                <div className={`${avatarSize} rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-base mb-0.5 shadow-sm shrink-0
                                            ${student.gender === 'FEMALE' ? 'bg-pink-400' : 'bg-blue-500'}
                                        `}>
                                                    {student.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className={`font-semibold text-gray-800 ${textSize} text-center px-0.5 truncate w-full leading-tight`}>
                                                    {student.name}
                                                </span>
                                            </>
                                        ) : (
                                            <div className="text-gray-300 flex flex-col items-center gap-0.5 sm:gap-1 group-hover:text-indigo-400 transition-colors">
                                                <div className={`${isCompact ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-6 h-6 sm:w-8 sm:h-8'} rounded-full border-2 border-dashed border-current flex items-center justify-center shrink-0`}>
                                                    <span className={isCompact ? 'text-xs' : 'text-sm sm:text-lg'}>+</span>
                                                </div>
                                                <span className={`${textSize} font-medium`}>Trống</span>
                                            </div>
                                        )}

                                        {isSelected && (
                                            <div className="absolute -top-3 -right-3 bg-indigo-600 text-white rounded-full p-1 shadow-lg animate-bounce">
                                                <AlertCircle className="h-4 w-4" />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-white flex justify-between items-center z-10">
                    <div className="text-sm text-gray-500 font-medium flex items-center gap-2">
                        {selectedSeat ? (
                            <span className="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span></span>
                                Đang chọn chỗ H{selectedSeat.row + 1}-C{selectedSeat.col + 1}. Nhấn chỗ khác để đổi, hoặc chọn HS ở cột trái để xếp.
                            </span>
                        ) : (
                            "Nhấn vào ghế trống để xếp, hoặc 2 học sinh để đổi chỗ."
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition">
                            Hủy
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition disabled:opacity-50"
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <Save className="h-5 w-5" />
                            )}
                            {isSaving ? 'Đang lưu...' : 'Lưu sơ đồ'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
