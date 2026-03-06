import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
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
  X,
  Download,
  Clock,
  Trash2
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
           <button 
             onClick={() => setMode('history')}
             className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${mode === 'history' ? 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
           >
             歷史紀錄
           </button>
           <button 
             onClick={() => setMode('dashboard')}
             className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${mode === 'dashboard' ? 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
           >
             統計報表
           </button>
        </div>
      </div>
    </nav>
  );
};


const checkCompliance = (data) => {
  const r = data.raw_data || {};
  const checks = [];

  // 1. Professional: 品質+倫理+法規 >= 24, capped at 36
  const qualTotal = (r.qual_physical || 0) + (r.qual_online || 0);
  const ethicTotal = (r.ethic_physical || 0) + (r.ethic_online || 0);
  const lawTotal = (r.law_physical || 0) + (r.law_online || 0);
  const profSubTotal = qualTotal + ethicTotal + lawTotal;
  const profCapped = Math.min(profSubTotal, 36);
  checks.push({
    id: 'professional',
    label: '專業品質/倫理/法規',
    pass: profSubTotal >= 24,
    current: profSubTotal,
    required: 24,
    note: profSubTotal > 36 ? `超過 36 點，以 36 點計 (${profSubTotal})` : null,
    detail: `品質 ${qualTotal} + 倫理 ${ethicTotal} + 法規 ${lawTotal} = ${profSubTotal} 點`
  });

  // 2. Special categories: each > 0 AND total >= 10
  const fire = r.fire_safety || 0;
  const emergency = r.emergency || 0;
  const infection = r.infection || 0;
  const gender = r.gender || 0;
  const specialTotal = fire + emergency + infection + gender;
  const allTopicsDone = fire > 0 && emergency > 0 && infection > 0 && gender > 0;
  const missingTopics = [];
  if (fire === 0) missingTopics.push('消防安全');
  if (emergency === 0) missingTopics.push('緊急應變');
  if (infection === 0) missingTopics.push('感染管制');
  if (gender === 0) missingTopics.push('性別敏感度');
  checks.push({
    id: 'special',
    label: '特定族群課程',
    pass: allTopicsDone && specialTotal >= 10,
    current: specialTotal,
    required: 10,
    note: !allTopicsDone ? `尚缺: ${missingTopics.join('、')}` : null,
    detail: `消防 ${fire} + 緊急 ${emergency} + 感染 ${infection} + 性別 ${gender} = ${specialTotal} 點`
  });

  // 3. Indigenous/Cultural: legacy >= 2
  const legacy = r.indigenous_legacy || 0;
  checks.push({
    id: 'indigenous',
    label: '原住民族/多元文化',
    pass: legacy >= 2,
    current: legacy,
    required: 2,
    detail: `113年6月2日前累計 ${legacy} 點`
  });

  // 4. Total points >= 120
  const totalPoints = data.total_points || 0;
  checks.push({
    id: 'total',
    label: '總積分',
    pass: totalPoints >= 120,
    current: totalPoints,
    required: 120,
    detail: `總計 ${totalPoints} 點`
  });

  const allPass = checks.every(c => c.pass);
  return { checks, allPass };
};


const DetailView = ({ data }) => {
  const r = data.raw_data || {};
  const compliance = checkCompliance(data);
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

      {/* Compliance Summary */}
      <div className={`rounded-xl border-2 p-5 mb-6 ${compliance.allPass ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-full ${compliance.allPass ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
            {compliance.allPass ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
          </div>
          <div>
            <div className="font-bold text-lg">{compliance.allPass ? '✅ 符合換證標準' : '⚠️ 尚未符合換證標準'}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {compliance.checks.filter(c => c.pass).length} / {compliance.checks.length} 項目通過
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {compliance.checks.map(c => (
            <div key={c.id} className={`rounded-lg p-3 border ${c.pass ? 'bg-white border-emerald-100' : 'bg-white border-amber-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-600">{c.label}</span>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${c.pass ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {c.pass ? '通過' : '未達標'}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-xl font-bold font-mono ${c.pass ? 'text-emerald-600' : 'text-amber-600'}`}>{c.current}</span>
                <span className="text-xs text-slate-400">/ {c.required} 點</span>
              </div>
              {c.note && <div className="text-[10px] text-amber-600 mt-1">⚠ {c.note}</div>}
              <div className="text-[10px] text-slate-400 mt-0.5">{c.detail}</div>
            </div>
          ))}
        </div>
      </div>

      
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


const HistoryView = () => {
  const [records, setRecords] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchText, setSearchText] = React.useState('');
  const [expandedRows, setExpandedRows] = React.useState(new Set());

  const fetchHistory = async (search = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const resp = await fetch(`/api/history?${params}`);
      const data = await resp.json();
      setRecords(data.results || []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchHistory();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchHistory(searchText);
  };

  const handleDelete = async (id) => {
    if (!confirm('確定要刪除這筆紀錄嗎？')) return;
    try {
      await fetch(`/api/history/${id}`, { method: 'DELETE' });
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert('刪除失敗: ' + err.message);
    }
  };

  const toggleRow = (index) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setExpandedRows(newSet);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden relative">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-400 to-purple-500" />
      
      <div className="px-6 py-5 border-b border-gray-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Clock className="text-indigo-500 h-5 w-5" />
          <h2 className="font-bold text-slate-800">歷史查詢紀錄</h2>
          <span className="text-xs font-bold px-2.5 py-1 bg-slate-200 text-slate-600 rounded-full">{records.length} 筆</span>
        </div>
        
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="搜尋姓名、ID 或機構..." 
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-all">
            搜尋
          </button>
        </form>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-400 mb-3" />
          <p className="text-slate-400">載入中...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="p-12 text-center text-slate-400">
          <Clock className="mx-auto h-12 w-12 text-slate-200 mb-4" />
          <p>尚無查詢紀錄</p>
          <p className="text-xs mt-1">查詢結果會自動儲存在這裡</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {records.map((r, i) => (
            <div key={r.id || i} className="group transition-all hover:bg-slate-50/50">
              <div 
                className={`px-6 py-4 flex items-center justify-between cursor-pointer transition-all border-l-4 ${expandedRows.has(i) ? 'border-indigo-500 bg-indigo-50/10' : 'border-transparent'}`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0" onClick={() => toggleRow(i)}>
                  <div className="p-2 rounded-full bg-indigo-100 text-indigo-600 flex-shrink-0">
                    <Clock size={18} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-2 flex-1 min-w-0">
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-0.5 md:hidden">姓名</div>
                      <div className="font-bold text-slate-900 truncate">{r.name || '-'}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-0.5 md:hidden">機構</div>
                      <div className="text-slate-600 truncate">{r.organization || '-'}</div>
                    </div>
                    <div className="min-w-0 hidden md:block">
                      <div className="text-sm text-slate-600">{r.valid_period || '-'}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-0.5 md:hidden">總積分</div>
                      <div className="font-bold text-indigo-600 font-mono text-lg leading-none">{r.total_points}</div>
                    </div>
                    <div className="min-w-0 hidden md:block">
                      <div className="text-xs text-slate-400">{r.queried_at ? new Date(r.queried_at).toLocaleString('zh-TW') : '-'}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                    title="刪除"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className={`text-slate-300 transition-transform duration-300 ${expandedRows.has(i) ? 'rotate-180 text-indigo-500' : ''}`} onClick={() => toggleRow(i)}>
                    <ChevronDown size={20} />
                  </div>
                </div>
              </div>
              
              {expandedRows.has(i) && (
                <div className="border-t border-gray-100 animate-in slide-in-from-top-2 fade-in duration-300">
                  <DetailView data={r} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};



const DashboardView = () => {
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const resp = await fetch('/api/dashboard/stats');
        const data = await resp.json();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-12 text-center">
        <Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-400 mb-3" />
        <p className="text-slate-400">載入統計數據中...</p>
      </div>
    );
  }

  if (!stats || stats.total_people === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-12 text-center">
        <PieChartIcon className="mx-auto h-12 w-12 text-slate-200 mb-4" />
        <p className="text-slate-400">尚無足夠數據產生報表</p>
      </div>
    );
  }

  const passRate = Math.round((stats.pass_count / stats.total_people) * 100);
  
  const pieData = [
    { name: '合規 (Pass)', value: stats.pass_count, color: '#10b981' },
    { name: '未達標 (Fail)', value: stats.fail_count, color: '#f59e0b' }
  ];

  const barData = [
    { name: '專業(品質/倫理/法規)', count: stats.missing_stats.professional },
    { name: '特定(消防/感控/性別/應變)', count: stats.missing_stats.special },
    { name: '原住民/多元文化', count: stats.missing_stats.indigenous },
    { name: '總積分(不足120)', count: stats.missing_stats.total },
  ];

  return (
    <div className="space-y-6">
      {/* Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">總查詢人數</div>
          <div className="text-3xl font-bold text-slate-800">{stats.total_people}</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-emerald-400" />
          <div className="text-slate-500 text-sm font-medium mb-1">合格人數</div>
          <div className="text-3xl font-bold text-emerald-600">{stats.pass_count}</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-amber-400" />
          <div className="text-slate-500 text-sm font-medium mb-1">未達標人數</div>
          <div className="text-3xl font-bold text-amber-600">{stats.fail_count}</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">整體合格率</div>
          <div className="text-3xl font-bold text-indigo-600">{passRate}%</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pie Chart */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">合格比例分佈</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">未達標原因統計</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12}} />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#818cf8" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#f43f5e' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
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
           <button 
             onClick={() => setMode('history')}
             className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'history' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-500'}`}
           >
             歷史紀錄
           </button>
           <button 
             onClick={() => setMode('dashboard')}
             className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'dashboard' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-500'}`}
           >
             統計報表
           </button>
        </div>

        {mode === 'dashboard' ? <DashboardView /> : mode === 'history' ? <HistoryView /> : (<>
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
                      <div className="flex items-center justify-between">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">上傳 Excel 檔案</label>
                        <a href="/api/template/download" className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors">
                          <Download size={14} /> 下載範本
                        </a>
                      </div>
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
                    <button
                      onClick={async () => {
                        try {
                          const resp = await fetch('/api/export/excel', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ results })
                          });
                          if (!resp.ok) throw new Error('Export failed');
                          const blob = await resp.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = '長照積分查詢結果.xlsx';
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch (err) {
                          alert('匯出失敗: ' + err.message);
                        }
                      }}
                      className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all transform active:scale-95"
                    >
                      <Download size={16} /> 匯出 Excel
                    </button>
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
                              {(() => {
                                const comp = r.status === 'success' ? checkCompliance(r) : null;
                                return comp ? (
                                  <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${comp.allPass ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {comp.allPass ? '✅ 合規' : '⚠️ 未達標'}
                                  </span>
                                ) : null;
                              })()}
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
        </>)}
      </main>
    </div>
  );
}
