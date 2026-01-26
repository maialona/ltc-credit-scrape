import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Search, 
  Upload, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Menu,
  X
} from 'lucide-react';

/* --- Components --- */

const Navbar = ({ mode, setMode }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${scrolled ? 'bg-white/80 backdrop-blur-md border-slate-200 shadow-sm py-3' : 'bg-white border-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo Area */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl shadow-lg shadow-teal-500/20 text-white">
            <FileText size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">長照積分查詢系統</h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide mt-0.5">LTC Credit Explorer</p>
          </div>
        </div>

        {/* Desktop Nav / Mode Switcher */}
        <div className="hidden md:flex bg-slate-100/50 p-1 rounded-lg border border-slate-200/60">
           <button 
             onClick={() => setMode('single')}
             className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${mode === 'single' ? 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
           >
             單筆查詢
           </button>
           <button 
             onClick={() => setMode('batch')}
             className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${mode === 'batch' ? 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
           >
             整批查詢
           </button>
        </div>
      </div>
    </nav>
  );
};

const DetailView = ({ data }) => {
  const r = data.raw_data || {};
  const specialTotal = (r.fire_safety || 0) + (r.emergency || 0) + (r.infection || 0) + (r.gender || 0);

  const SectionHeader = ({ title, sub }) => (
    <div className="flex items-baseline gap-2 mb-3 mt-6 pb-2 border-b border-gray-100">
      <h3 className="text-base font-bold text-slate-800 border-l-4 border-teal-500 pl-2">{title}</h3>
      {sub && <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{sub}</span>}
    </div>
  );

  const GridTable = ({ headers, children, colSizes }) => (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm ring-1 ring-slate-100">
      <table className="w-full text-sm">
        <colgroup>
           {colSizes.map((w, i) => <col key={i} style={{ width: w }} />)}
        </colgroup>
        <thead className="bg-slate-50/80 border-b border-gray-200">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${i === 0 ? 'text-left' : (i === headers.length - 1 ? 'text-left' : 'text-center')}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-slate-600">
          {children}
        </tbody>
      </table>
    </div>
  );

  const Cell = ({ children, className = "", ...props }) => (
    <td className={`px-4 py-3 ${className}`} {...props}>
      {children}
    </td>
  );

  return (
    <div className="p-6 bg-slate-50/50 rounded-b-xl border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
      
      {/* 1. Professional Courses */}
      <SectionHeader title="專業課程" />
      <GridTable headers={['課程屬性', '登錄積分 (實體)', '登錄積分 (網路)', '法規標準']} colSizes={['20%', '15%', '15%', '50%']}>
        <tr>
          <Cell className="font-medium text-slate-900">專業課程</Cell>
          <Cell className="text-center font-mono text-teal-600 bg-teal-50/30">{r.prof_physical}</Cell>
          <Cell className="text-center font-mono text-slate-500">{r.prof_online}</Cell>
          <Cell className="text-slate-500 text-xs leading-relaxed" rowSpan={4}>
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 mt-1.5 rounded-full bg-teal-400 flex-shrink-0" />
              <span>專業品質、專業倫理、專業法規累積積分至少 24 點</span>
            </div>
            <div className="flex items-start gap-2 mt-1">
               <div className="w-1 h-1 mt-1.5 rounded-full bg-teal-400 flex-shrink-0" />
               <span>超過 36 點者，以 36 點計</span>
            </div>
          </Cell>
        </tr>
        {['專業品質', '專業倫理', '專業法規'].map((item, idx) => {
           const keys = [
             { p: r.qual_physical, o: r.qual_online },
             { p: r.ethic_physical, o: r.ethic_online },
             { p: r.law_physical, o: r.law_online }
           ];
           return (
             <tr key={item}>
               <Cell className="font-medium text-slate-900">{item}</Cell>
               <Cell className="text-center font-mono text-teal-600 bg-teal-50/30">{keys[idx].p}</Cell>
               <Cell className="text-center font-mono text-slate-500">{keys[idx].o}</Cell>
             </tr>
           );
        })}
      </GridTable>

      {/* 2. Special Categories */}
      <SectionHeader title="特定族群" />
      <GridTable headers={['課程屬性', '系統登錄積分', '累積積分', '法規標準']} colSizes={['20%', '15%', '15%', '50%']}>
         <tr>
          <Cell className="font-medium text-slate-900">消防安全</Cell>
          <Cell className="text-center font-mono">{r.fire_safety}</Cell>
          <Cell className="text-center align-middle bg-amber-50/50" rowSpan={4}>
            <span className={`text-lg font-bold ${specialTotal >= 10 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {specialTotal.toFixed(1)}
            </span>
          </Cell>
          <Cell className="text-slate-500 text-xs leading-relaxed" rowSpan={4}>
             <div className="space-y-1">
               <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>各主題已至少完成一堂</p>
               <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>累計積分至少 10 點</p>
             </div>
          </Cell>
        </tr>
        <tr><Cell className="font-medium text-slate-900">緊急應變</Cell><Cell className="text-center font-mono">{r.emergency}</Cell></tr>
        <tr><Cell className="font-medium text-slate-900">感染管制</Cell><Cell className="text-center font-mono">{r.infection}</Cell></tr>
        <tr><Cell className="font-medium text-slate-900">性別敏感度</Cell><Cell className="text-center font-mono">{r.gender}</Cell></tr>
      </GridTable>

      {/* 3. Cultural */}
       <SectionHeader title="原住民族與多元族群" />
       <GridTable headers={['課程類別', '累積積分', '法規標準']} colSizes={['40%', '15%', '45%']}>
          <tr>
            <Cell className="font-medium text-slate-900">
              <div>原住民族與多元族群文化敏感度及能力</div>
              <div className="text-xs text-slate-400 mt-0.5">(原名稱：多元文化族群)</div>
            </Cell>
            <Cell className="text-center font-mono font-medium">{r.indigenous_legacy}</Cell>
            <Cell className="text-slate-500 text-xs">113年6月2日以前合計 2 點</Cell>
          </tr>
          <tr>
            <Cell className="font-medium text-slate-900">原住民族文化敏感度及能力</Cell>
            <Cell className="text-center font-mono font-medium">{r.indigenous_culture}</Cell>
            <Cell className="text-slate-500 text-xs">113年6月3日以後每年 1 點</Cell>
          </tr>
          <tr>
            <Cell className="font-medium text-slate-900">多元族群文化敏感度及能力</Cell>
            <Cell className="text-center font-mono font-medium">{r.diverse_culture}</Cell>
            <Cell className="text-slate-500 text-xs">113年6月3日以後每年 1 點</Cell>
          </tr>
       </GridTable>

       {/* 4. Totals */}
       <SectionHeader title="總積分統計" />
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between ring-1 ring-slate-100">
             <div>
               <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">實體課程</div>
               <div className="text-2xl font-bold text-slate-800 font-mono">{r.total_physical}</div>
             </div>
             <div className="h-10 w-10 bg-teal-50 rounded-full flex items-center justify-center text-teal-600">
               <FileText size={20} />
             </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden ring-1 ring-slate-100">
             <div className="px-4 py-3 border-b border-gray-100 bg-slate-50 flex justify-between items-center">
                <span className="text-slate-600 text-sm font-semibold">網路課程</span>
             </div>
             <div className="p-0">
               <table className="w-full text-sm">
                 <tbody className="divide-y divide-gray-100">
                   <tr>
                     <Cell className="text-xs text-slate-500 w-1/2">112.10.12 以前</Cell>
                     <Cell className="text-right font-mono font-medium text-slate-700">{r.total_online_old} <span className="text-xs text-slate-400 font-sans">/ 60</span></Cell>
                   </tr>
                   <tr>
                     <Cell className="text-xs text-slate-500 w-1/2 bg-yellow-50/50">112.10.13 以後</Cell>
                     <Cell className="text-right font-mono font-bold text-teal-600 bg-yellow-50/50">{r.total_online_new} <span className="text-xs text-slate-400 font-sans">/ 40</span></Cell>
                   </tr>
                 </tbody>
               </table>
             </div>
          </div>
       </div>

       {/* 5. Course Details */}
       {data.courses && data.courses.length > 0 && (
        <div className="mt-8">
          <SectionHeader title="詳細課程紀錄" />
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm ring-1 ring-slate-100">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-500 w-24">日期</th>
                  <th className="px-3 py-2 font-semibold text-slate-500">課程名稱</th>
                  <th className="px-3 py-2 font-semibold text-slate-500 w-24">實施方式</th>
                  <th className="px-3 py-2 font-semibold text-slate-500">開課單位</th>
                  <th className="px-3 py-2 font-semibold text-slate-500 w-24">屬性</th>
                  <th className="px-3 py-2 font-semibold text-slate-500 w-24">類別</th>
                  <th className="px-3 py-2 font-semibold text-slate-500">訓練課程</th>
                  <th className="px-3 py-2 font-semibold text-slate-500 text-right w-16">積分</th>
                  <th className="px-3 py-2 font-semibold text-slate-500 text-center w-16">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.courses.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors align-top">
                    <td className="px-3 py-2 text-slate-600 font-mono tracking-tight">{c.date}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{c.name}</td>
                    <td className="px-3 py-2 text-slate-500">{c.mode}</td>
                    <td className="px-3 py-2 text-slate-500">{c.unit}</td>
                    <td className="px-3 py-2 text-slate-500">{c.attribute}</td>
                    <td className="px-3 py-2 text-slate-500">{c.category}</td>
                    <td className="px-3 py-2 text-slate-500">{c.training_course}</td>
                    <td className="px-3 py-2 font-mono text-teal-600 text-right font-bold">{c.points}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap ${c.status === '符合' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
       )}

    </div>
  );
};

export default function App() {
  // Custom Hook for Persistence
  const usePersistentState = (key, initialValue) => {
    const [state, setState] = useState(() => {
      try {
        const item = localStorage.getItem(key);
        return item !== null ? item : initialValue;
      } catch (error) {
        console.error(`Error reading localStorage key "${key}":`, error);
        return initialValue;
      }
    });

    useEffect(() => {
      try {
        localStorage.setItem(key, state);
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    }, [key, state]);

    return [state, setState];
  };

  // Load initial state from localStorage if available
  const [mode, setMode] = usePersistentState('ltc_mode', 'single');
  const [idno, setIdno] = usePersistentState('ltc_idno', '');
  const [dob, setDob] = usePersistentState('ltc_dob', '');
  
  const [file, setFile] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Logs & Progress
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const ProgressBar = ({ current, total }) => {
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    return (
      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-teal-400 to-cyan-500 h-2.5 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(45,212,191,0.5)]" 
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  };

  const LogWindow = ({ logs }) => {
    const endRef = useRef(null);
    useEffect(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    return (
      <div className="w-full h-40 bg-slate-900 rounded-lg border border-slate-700 p-3 overflow-y-auto font-mono text-xs shadow-inner">
        {logs.length === 0 && <div className="text-slate-500 italic">等待處理...</div>}
        {logs.map((log, i) => (
          <div key={i} className="mb-0.5 pl-1 border-l-2 border-slate-700 hover:border-teal-500 transition-colors">
             <span className="text-teal-400 mr-2 opacity-70">[{new Date().toLocaleTimeString()}]</span>
             <span className="text-slate-300">{log}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    );
  };

  const toggleRow = (index) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setExpandedRows(newSet);
  };
  
  // Shared Stream Handler
  const handleStreamResponse = async (response, isBatch = false) => {
      if (!response.ok) {
          const errText = await response.text();
          let msg = response.statusText;
          try { msg = JSON.parse(errText).detail || msg; } catch(e) {}
          throw new Error(msg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop(); 
          
          for (const line of lines) {
              if (!line.trim()) continue;
              try {
                  const event = JSON.parse(line);
                  
                  if (event.type === 'start') {
                      if (event.total) setProgress(p => ({ ...p, total: event.total }));
                      setLogs(prev => [...prev, isBatch ? `開始處理，共 ${event.total} 筆資料...` : "開始查詢..."]);
                  } else if (event.type === 'log') {
                       setLogs(prev => [...prev, event.message]);
                  } else if (event.type === 'progress') {
                       setProgress(p => ({ ...p, current: event.current }));
                  } else if (event.type === 'result') {
                       setResults(prev => isBatch ? [...prev, event.data] : [event.data]);
                  } else if (event.type === 'error') {
                       setError(event.message);
                       setLogs(prev => [...prev, `❌ 錯誤: ${event.message}`]);
                  }
              } catch (parseErr) {
                  console.error("JSON Parse Error:", parseErr, line);
              }
          }
      }
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);
    setLogs([]); // Clear logs for single query
    setProgress({ current: 0, total: 100 }); // Default for single query
    setExpandedRows(new Set([0]));
    
    try {
      const response = await fetch('/api/crawl/single', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idno, dob })
      });
      
      await handleStreamResponse(response, false);

    } catch (err) {
      setError(err.message);
      setLogs(prev => [...prev, `❌ 發生錯誤: ${err.message}`]);
    } finally {
      setLoading(false);
      setLogs(prev => [...prev, "--- 查詢結束 ---"]);
    }
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setLogs([]);
    setProgress({ current: 0, total: 0 });
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/crawl/batch', {
            method: 'POST',
            body: formData,
        });

        await handleStreamResponse(response, true);

    } catch (err) {
      setError(err.message);
      setLogs(prev => [...prev, `❌ 發生嚴重錯誤: ${err.message}`]);
    } finally {
      setLoading(false);
      setLogs(prev => [...prev, "--- 處理完成 ---"]);
    }
  };

  // Filter & Sort State
  const [filterText, setFilterText] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'total_points', direction: 'desc' });

  // Computed Results
  const filteredResults = React.useMemo(() => {
    let res = [...results];
    
    // Filter
    if (filterText) {
      const lower = filterText.toLowerCase();
      res = res.filter(r => 
        (r.name || '').toLowerCase().includes(lower) ||
        (r.idno || '').toLowerCase().includes(lower) ||
        (r.organization || '').toLowerCase().includes(lower) ||
        (r.emp_id || '').toLowerCase().includes(lower)
      );
    }

    // Sort
    res.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      // Handle numeric specifically
      if (sortConfig.key === 'total_points') {
         aVal = parseFloat(aVal) || 0;
         bVal = parseFloat(bVal) || 0;
      } else {
         aVal = (aVal || '').toString();
         bVal = (bVal || '').toString();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return res;
  }, [results, filterText, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <div className="w-4 h-4" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 pt-24">
      
      {/* Search Mode is now moved to Navbar on large screens, but we need it here for mobile or cleaner layout 
          Actually, let's keep tabs here for simplicity as planned, but styled nicely.
      */}
      
      <Navbar mode={mode} setMode={setMode} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Mobile Mode Switcher (Visible only on small screens) */}
        <div className="md:hidden flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
           <button 
             onClick={() => setMode('single')}
             className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'single' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-500'}`}
           >
             單筆查詢
           </button>
           <button 
             onClick={() => setMode('batch')}
             className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'batch' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-500'}`}
           >
             整批查詢
           </button>
        </div>

        {/* Input Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal-400 to-emerald-500" />
          
          <div className="p-6 md:p-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">{mode === 'single' ? '單筆查詢' : '整批查詢'}</h2>
              <p className="text-slate-500">
                {mode === 'single' ? '輸入身分證字號與出生年月日進行查詢。' : '上傳 Excel 檔案以進行大量批次查詢。'}
              </p>
            </div>

            {mode === 'single' ? (
               <form onSubmit={handleSingleSubmit} className="flex flex-col md:flex-row gap-5 items-end">
                 <div className="flex-1 w-full space-y-1.5">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">身分證字號</label>
                   <input type="text" value={idno} onChange={(e) => setIdno(e.target.value)} placeholder="A123456789" className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900 placeholder-slate-400 transition-all outline-none font-medium" required />
                 </div>
                 <div className="flex-1 w-full space-y-1.5">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">出生年月日</label>
                   <input type="text" value={dob} onChange={(e) => setDob(e.target.value)} placeholder="090/01/01" className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900 placeholder-slate-400 transition-all outline-none font-medium" required />
                 </div>
                 <button type="submit" disabled={loading} className="w-full md:w-auto px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform active:scale-95">
                   {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <><Search size={18} /> 查詢</>}
                 </button>
               </form>
            ) : (
               <form onSubmit={handleBatchSubmit} className="flex flex-col md:flex-row gap-5 items-end">
                  <div className="flex-1 w-full space-y-1.5">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">上傳 Excel 檔案</label>
                     <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
                        <input type="file" onChange={(e) => setFile(e.target.files[0])} className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 transition-all cursor-pointer" accept=".xlsx" />
                     </div>
                  </div>
                  <button type="submit" disabled={loading || !file} className="w-full md:w-auto px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform active:scale-95">
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <><Upload size={18} /> 開始處理</>}
                  </button>
               </form>
            )}
            
            {/* Progress & Logs (Shared) */}
            {loading && (
              <div className="mt-8 space-y-3 animate-in fade-in slide-in-from-top-2">
                 <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>{mode === 'single' ? '查詢進度' : '處理進度'}</span>
                    <span>{progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%</span>
                 </div>
                 <ProgressBar current={progress.current} total={progress.total} />
                 
                 <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                   <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">執行紀錄</div>
                   <LogWindow logs={logs} />
                 </div>
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-rose-50 text-rose-700 rounded-xl flex items-start gap-3 border border-rose-100 animate-in shake">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm font-medium">{error}</div>
              </div>
            )}
          </div>
        </div>

        {/* Results List */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
             
             {/* Filter & Sort Bar */}
             <div className="px-6 py-5 border-b border-gray-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4 backdrop-blur-sm">
               <div className="flex items-center gap-2">
                   <h2 className="font-bold text-slate-800 flex items-center gap-2">
                      <CheckCircle className="text-teal-500 h-5 w-5" />
                      查詢結果
                   </h2>
                   <span className="text-xs font-bold px-2.5 py-1 bg-slate-200 text-slate-600 rounded-full">{filteredResults.length} 筆</span>
               </div>
               
               <div className="flex items-center gap-3 w-full md:w-auto">
                   <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <input 
                        type="text" 
                        placeholder="搜尋姓名、ID 或機構..." 
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                      />
                   </div>
               </div>
             </div>
             
             {/* Column Headers (Sortable) */}
             <div className="px-6 py-3 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-5 border-b border-white">
                 <div className="w-10"></div>
                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-8 flex-1">
                      <div className="cursor-pointer hover:text-teal-600 flex items-center gap-1 flex-nowrap shrink-0" onClick={() => handleSort('emp_id')}>
                          <span className="whitespace-nowrap">員工編號</span> <SortIcon column="emp_id" />
                      </div>
                      <div className="cursor-pointer hover:text-teal-600 flex items-center gap-1 flex-nowrap shrink-0" onClick={() => handleSort('name')}>
                          <span className="whitespace-nowrap">姓名</span> <SortIcon column="name" />
                      </div>
                      <div className="cursor-pointer hover:text-teal-600 flex items-center gap-1 flex-nowrap shrink-0" onClick={() => handleSort('organization')}>
                          <span className="whitespace-nowrap">機構</span> <SortIcon column="organization" />
                      </div>
                      <div className="hidden lg:flex cursor-pointer hover:text-teal-600 items-center gap-1 flex-nowrap shrink-0" onClick={() => handleSort('valid_period')}>
                          <span className="whitespace-nowrap">有效期限</span> <SortIcon column="valid_period" />
                      </div>
                      <div className="cursor-pointer hover:text-teal-600 flex items-center gap-1 flex-nowrap shrink-0" onClick={() => handleSort('total_points')}>
                          <span className="whitespace-nowrap">總積分</span> <SortIcon column="total_points" />
                      </div>
                 </div>
                 <div className="w-9"></div>
             </div>

             <div className="divide-y divide-gray-100">
               {filteredResults.map((r, i) => (
                 <div key={i} className="group transition-all hover:bg-slate-50/50">
                   <div 
                     onClick={() => toggleRow(i)}
                     className={`px-6 py-5 flex items-center justify-between cursor-pointer transition-all border-l-4 ${expandedRows.has(i) ? 'border-teal-500 bg-teal-50/10' : 'border-transparent'}`}
                   >
                     <div className="flex items-center gap-5 flex-1 w-full overflow-hidden">
                        <div className={`p-2.5 rounded-full flex-shrink-0 ${r.status === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                           {r.status === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-3 flex-1 min-w-0">
                           <div className="min-w-0">
                             {/* Mobile Header: only show if stacked */}
                             <div className="md:hidden text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-1">員工編號</div>
                             <div className="font-mono text-slate-700 font-medium truncate">{r.emp_id || '-'}</div>
                           </div>
                           <div className="min-w-0">
                             <div className="md:hidden text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-1">姓名</div>
                             <div className="font-bold text-slate-900 truncate">{r.name || '-'}</div>
                           </div>
                           <div className="min-w-0">
                             <div className="md:hidden text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-1">機構</div>
                             <div className="font-medium text-slate-700 truncate">{r.organization || '-'}</div>
                           </div>
                           <div className="hidden lg:block min-w-0">
                             <div className="text-sm text-slate-600 font-medium">{r.valid_period || '-'}</div>
                           </div>
                           <div className="min-w-0">
                             <div className="md:hidden text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-1">總積分</div>
                             <div className="font-bold text-teal-600 font-mono text-lg leading-none">{r.total_points}</div>
                           </div>
                        </div>
                     </div>
                     <div className={`pl-4 text-slate-300 transition-transform duration-300 ${expandedRows.has(i) ? 'rotate-180 text-teal-500' : ''}`}>
                       <ChevronDown size={20} />
                     </div>
                   </div>
                   
                   {expandedRows.has(i) && (
                     <div className="border-t border-gray-100 animate-in slide-in-from-top-2 fade-in duration-300">
                       <DetailView data={r} />
                     </div>
                   )}
                 </div>
               ))}
               
               {filteredResults.length === 0 && (
                   <div className="p-12 text-center text-slate-400">
                       <Search className="mx-auto h-12 w-12 text-slate-200 mb-4" />
                       <p>沒有符合搜尋條件的結果</p>
                   </div>
               )}
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
