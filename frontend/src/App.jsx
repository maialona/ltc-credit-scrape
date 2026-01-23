import React, { useState } from 'react';
import axios from 'axios';
import { 
  Search, 
  Upload, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';

const DetailView = ({ data }) => {
  const r = data.raw_data || {};
  const specialTotal = (r.fire_safety || 0) + (r.emergency || 0) + (r.infection || 0) + (r.gender || 0);

  const SectionHeader = ({ title, sub }) => (
    <div className="flex items-baseline gap-2 mb-3 mt-6 pb-2 border-b border-gray-100">
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      {sub && <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{sub}</span>}
    </div>
  );

  const GridTable = ({ headers, children, colSizes }) => (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <table className="w-full text-sm">
        <colgroup>
           {colSizes.map((w, i) => <col key={i} style={{ width: w }} />)}
        </colgroup>
        <thead className="bg-slate-50 border-b border-gray-200">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${i === 0 ? 'text-left' : (i === headers.length - 1 ? 'text-left' : 'text-center')}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {children}
        </tbody>
      </table>
    </div>
  );

  const Cell = ({ children, className = "", ...props }) => (
    <td className={`px-4 py-3 text-slate-700 ${className}`} {...props}>
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
          <Cell className="text-center font-mono text-indigo-600 bg-indigo-50/30">{r.prof_physical}</Cell>
          <Cell className="text-center font-mono text-slate-500">{r.prof_online}</Cell>
          <Cell className="text-slate-500 text-xs leading-relaxed" rowSpan={4}>
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 mt-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <span>專業品質、專業倫理、專業法規累積積分至少 24 點</span>
            </div>
            <div className="flex items-start gap-2 mt-1">
               <div className="w-1 h-1 mt-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
               <span>超過 36 點者，以 36 點計</span>
            </div>
          </Cell>
        </tr>
        {['專業品質', '專業倫理', '專業法規'].map((item, idx) => {
           // Mapping internal keys based on item name for simplicity or hardcoding
           const keys = [
             { p: r.qual_physical, o: r.qual_online },
             { p: r.ethic_physical, o: r.ethic_online },
             { p: r.law_physical, o: r.law_online }
           ];
           return (
             <tr key={item}>
               <Cell className="font-medium text-slate-900">{item}</Cell>
               <Cell className="text-center font-mono text-indigo-600 bg-indigo-50/30">{keys[idx].p}</Cell>
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
               <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>各主題已至少完成一堂</p>
               <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>累計積分至少 10 點</p>
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
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
             <div>
               <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">實體課程</div>
               <div className="text-2xl font-bold text-slate-800 font-mono">{r.total_physical}</div>
             </div>
             <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
               <FileText size={20} />
             </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
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
                     <Cell className="text-right font-mono font-bold text-indigo-600 bg-yellow-50/50">{r.total_online_new} <span className="text-xs text-slate-400 font-sans">/ 40</span></Cell>
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
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-xs text-left whitespace-nowrap min-w-[1000px]">
              <thead className="bg-slate-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-500">日期</th>
                  <th className="px-3 py-2 font-semibold text-slate-500">課程名稱</th>
                  <th className="px-3 py-2 font-semibold text-slate-500">實施方式</th>
                  <th className="px-3 py-2 font-semibold text-slate-500">開課單位</th>
                  <th className="px-3 py-2 font-semibold text-slate-500">屬性</th>
                  <th className="px-3 py-2 font-semibold text-slate-500">類別</th>
                  <th className="px-3 py-2 font-semibold text-slate-500">訓練課程</th>
                  <th className="px-3 py-2 font-semibold text-slate-500 text-right">積分</th>
                  <th className="px-3 py-2 font-semibold text-slate-500 text-center">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.courses.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 text-slate-600">{c.date}</td>
                    <td className="px-3 py-2 font-medium text-slate-900 truncate max-w-[200px] whitespace-normal" title={c.name}>{c.name}</td>
                    <td className="px-3 py-2 text-slate-500 truncate max-w-[150px] whitespace-normal" title={c.mode}>{c.mode}</td>
                    <td className="px-3 py-2 text-slate-500 truncate max-w-[150px] whitespace-normal" title={c.unit}>{c.unit}</td>
                    <td className="px-3 py-2 text-slate-500">{c.attribute}</td>
                    <td className="px-3 py-2 text-slate-500">{c.category}</td>
                    <td className="px-3 py-2 text-slate-500 truncate max-w-[200px] whitespace-normal" title={c.training_course}>{c.training_course}</td>
                    <td className="px-3 py-2 font-mono text-indigo-600 text-right font-bold">{c.points}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${c.status === '符合' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
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
  const [mode, setMode] = useState('single');
  const [idno, setIdno] = useState('');
  const [dob, setDob] = useState('');
  const [file, setFile] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());

  /* --- NEW: Progress/Log Components --- */
  const ProgressBar = ({ current, total }) => {
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    return (
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
        <div 
          className="bg-gradient-to-r from-indigo-500 to-purple-600 h-4 rounded-full transition-all duration-500 ease-out flex items-center justify-center text-[10px] text-white font-bold" 
          style={{ width: `${pct}%` }}
        >
          {pct > 5 && `${pct}%`}
        </div>
      </div>
    );
  };

  const LogWindow = ({ logs }) => {
    const endRef = React.useRef(null);
    React.useEffect(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    return (
      <div className="w-full h-48 bg-slate-900 rounded-lg border border-slate-700 p-4 overflow-y-auto font-mono text-xs shadow-inner">
        {logs.length === 0 && <div className="text-slate-500 italic">等待處理...</div>}
        {logs.map((log, i) => (
          <div key={i} className="mb-1 border-l-2 border-slate-700 pl-2">
             <span className="text-emerald-400 mr-2">[{new Date().toLocaleTimeString()}]</span>
             <span className="text-slate-200">{log}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    );
  };
  /* ------------------------------------ */

  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const toggleRow = (index) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setExpandedRows(newSet);
  };
  
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);
    setExpandedRows(new Set([0]));
    
    try {
      const response = await axios.post('/api/crawl/single', { idno, dob });
      setResults([response.data]);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
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
        // Use fetch for streaming response
        const response = await fetch('/api/crawl/batch', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
             const errJson = await response.json();
             throw new Error(errJson.detail || response.statusText);
        }



        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) {

                break;
            }
            
            // setLogs(prev => [...prev, `收到資料: ${value.length} bytes`]); // Too noisy, maybe enable if needed
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            // Keep the last partial line in buffer
            buffer = lines.pop(); 
            
            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const event = JSON.parse(line);
                    
                    if (event.type === 'start') {
                        setProgress(p => ({ ...p, total: event.total }));
                        setLogs(prev => [...prev, `開始處理，共 ${event.total} 筆資料...`]);
                    } else if (event.type === 'log') {
                         setLogs(prev => [...prev, event.message]);
                    } else if (event.type === 'progress') {
                         setProgress(p => ({ ...p, current: event.current }));
                    } else if (event.type === 'result') {
                         setResults(prev => [...prev, event.data]);
                    }
                } catch (parseErr) {
                    console.error("JSON Parse Error:", parseErr, line);
                }
            }
        }

    } catch (err) {
      setError(err.message);
      setLogs(prev => [...prev, `❌ 發生嚴重錯誤: ${err.message}`]);
    } finally {
      setLoading(false);
      setLogs(prev => [...prev, "--- 處理完成 ---"]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-20">
      
      {/* Header */}
      <div className="bg-indigo-700 pb-24 pt-8 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-inner">
               <FileText className="text-white h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">長照積分查詢系統</h1>
          </div>
          <p className="text-indigo-200 text-sm ml-14">長照人員積分查詢與管理平台</p>
        </div>
      </div>

      <main className="-mt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Search Card */}
        <div className="bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="border-b border-gray-100 flex">
            <button 
              onClick={() => setMode('single')}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mode === 'single' ? 'text-indigo-600 bg-indigo-50/50 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <Search size={18} />
              單筆查詢
            </button>
            <button 
              onClick={() => setMode('batch')}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mode === 'batch' ? 'text-indigo-600 bg-indigo-50/50 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <Upload size={18} />
              整批查詢
            </button>
          </div>

          <div className="p-6 md:p-8">
            {mode === 'single' ? (
               <form onSubmit={handleSingleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                 <div className="flex-1 w-full space-y-1">
                   <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">身分證字號</label>
                   <input type="text" value={idno} onChange={(e) => setIdno(e.target.value)} placeholder="例如：A123456789" className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400 transition-all outline-none" required />
                 </div>
                 <div className="flex-1 w-full space-y-1">
                   <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">出生年月日</label>
                   <input type="text" value={dob} onChange={(e) => setDob(e.target.value)} placeholder="民國年/月/日 (例如：085/01/01)" className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400 transition-all outline-none" required />
                 </div>
                 <button type="submit" disabled={loading} className="w-full md:w-48 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                   {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <><Search size={18} /> 開始查詢</>}
                 </button>
               </form>
            ) : (
               <form onSubmit={handleBatchSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full space-y-1">
                     <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">上傳 Excel 檔案</label>
                     <input type="file" onChange={(e) => setFile(e.target.files[0])} className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all" accept=".xlsx" />
                  </div>
                  <button type="submit" disabled={loading || !file} className="w-full md:w-48 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <><Upload size={18} /> 開始處理</>}
                  </button>
               </form>
            )}
            
            {/* Progress & Logs (Visible during batch load) */}
            {loading && mode === 'batch' && (
              <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-top-2">
                 <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <span>處理進度</span>
                    <span>{progress.current} / {progress.total}</span>
                 </div>
                 <ProgressBar current={progress.current} total={progress.total} />
                 
                 <div className="mt-4">
                   <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">執行紀錄</div>
                   <LogWindow logs={logs} />
                 </div>
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 border border-red-100">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm">{error}</div>
              </div>
            )}
          </div>
        </div>

        {/* Results List */}
        {results.length > 0 && (
          <div className="bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
             <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
               <h2 className="font-bold text-slate-800">查詢結果</h2>
               <span className="text-xs font-medium px-2 py-1 bg-slate-200 text-slate-600 rounded-full">{results.length} 筆資料</span>
             </div>
             
             <div className="divide-y divide-gray-100">
               {results.map((r, i) => (
                 <div key={i} className="group transition-all">
                   <div 
                     onClick={() => toggleRow(i)}
                     className={`px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${expandedRows.has(i) ? 'bg-slate-50/80' : ''}`}
                   >
                     <div className="flex items-center gap-6 flex-1">
                        <div className={`p-2 rounded-lg ${r.status === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                           {r.status === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-x-8 gap-y-2 flex-1">
                           <div>
                             <div className="text-xs text-slate-400 uppercase font-semibold">員工編號</div>
                             <div className="font-mono text-slate-700">{r.emp_id || '-'}</div>
                           </div>
                           <div>
                             <div className="text-xs text-slate-400 uppercase font-semibold">姓名</div>
                             <div className="font-medium text-slate-900">{r.name || '-'}</div>
                           </div>
                           <div>
                             <div className="text-xs text-slate-400 uppercase font-semibold">機構</div>
                             <div className="font-medium text-slate-700">{r.organization || '-'}</div>
                           </div>
                           <div className="hidden md:block">
                             <div className="text-xs text-slate-400 uppercase font-semibold">有效期限</div>
                             <div className="text-sm text-slate-600">{r.valid_period || '-'}</div>
                           </div>
                           <div>
                             <div className="text-xs text-slate-400 uppercase font-semibold">總積分</div>
                             <div className="font-bold text-indigo-600 font-mono text-lg">{r.total_points}</div>
                           </div>
                        </div>
                     </div>
                     <div className="pl-4 text-slate-400">
                       {expandedRows.has(i) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                     </div>
                   </div>
                   
                   {expandedRows.has(i) && (
                     <div className="border-t border-gray-100">
                       <DetailView data={r} />
                     </div>
                   )}
                 </div>
               ))}
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
