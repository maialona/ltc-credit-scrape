"""
Patch App.jsx to add a Dashboard (統計報表) tab:
1. Add Recharts imports
2. Add 'dashboard' mode to Navbar tabs (desktop and mobile)
3. Add DashboardView component
4. Add dashboard mode rendering in main App
"""

filepath = r"c:\Users\User\Desktop\credit_crawl\frontend\src\App.jsx"

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

le = '\r\n' if lines[0].endswith('\r\n') else '\n'

# ============================================================
# PATCH 1: Add Recharts imports and Lucide icons
# ============================================================
import_idx = -1
for i, line in enumerate(lines):
    if line.startswith("import {"):
        import_idx = i
        break

if import_idx != -1:
    recharts_import = "import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';" + le
    lines.insert(import_idx, recharts_import)
    
    # Also add PieChart icon to lucide-react if missing
    for i in range(import_idx, import_idx+5):
        if 'lucide-react' in lines[i]:
            if 'PieChart as PieChartIcon' not in lines[i]:
                lines[i] = lines[i].replace('Clock,', 'Clock, PieChart as PieChartIcon,')
            break

# ============================================================
# PATCH 2: Add Dashboard view component
# ============================================================
dashboard_component = """
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
        <p className="text-slate-400">\u8f09\u5165\u7d71\u8a08\u6578\u64da\u4e2d...</p>
      </div>
    );
  }

  if (!stats || stats.total_people === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-12 text-center">
        <PieChartIcon className="mx-auto h-12 w-12 text-slate-200 mb-4" />
        <p className="text-slate-400">\u5c1a\u7121\u8db3\u5920\u6578\u64da\u7522\u751f\u5831\u8868</p>
      </div>
    );
  }

  const passRate = Math.round((stats.pass_count / stats.total_people) * 100);
  
  const pieData = [
    { name: '\u5408\u898f (Pass)', value: stats.pass_count, color: '#10b981' },
    { name: '\u672a\u9054\u6a19 (Fail)', value: stats.fail_count, color: '#f59e0b' }
  ];

  const barData = [
    { name: '\u5c08\u696d(\u54c1\u8cea/\u502b\u7406/\u6cd5\u898f)', count: stats.missing_stats.professional },
    { name: '\u7279\u5b9a(\u6d88\u9632/\u611f\u63a7/\u6027\u5225/\u61c9\u8b8a)', count: stats.missing_stats.special },
    { name: '\u539f\u4f4f\u6c11/\u591a\u5143\u6587\u5316', count: stats.missing_stats.indigenous },
    { name: '\u7e3d\u7a4d\u5206(\u4e0d\u8db3120)', count: stats.missing_stats.total },
  ];

  return (
    <div className="space-y-6">
      {/* Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">\u7e3d\u67e5\u8a62\u4eba\u6578</div>
          <div className="text-3xl font-bold text-slate-800">{stats.total_people}</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-emerald-400" />
          <div className="text-slate-500 text-sm font-medium mb-1">\u5408\u683c\u4eba\u6578</div>
          <div className="text-3xl font-bold text-emerald-600">{stats.pass_count}</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-amber-400" />
          <div className="text-slate-500 text-sm font-medium mb-1">\u672a\u9054\u6a19\u4eba\u6578</div>
          <div className="text-3xl font-bold text-amber-600">{stats.fail_count}</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">\u6574\u9ad4\u5408\u683c\u7387</div>
          <div className="text-3xl font-bold text-indigo-600">{passRate}%</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pie Chart */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">\u5408\u683c\u6bd4\u4f8b\u5206\u4f48</h3>
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
          <h3 className="text-lg font-bold text-slate-800 mb-6">\u672a\u9054\u6a19\u539f\u56e0\u7d71\u8a08</h3>
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
""".replace('\n', le)

app_line = -1
for i, line in enumerate(lines):
    if 'export default function App()' in line:
        app_line = i
        break

if app_line != -1:
    insert_lines = [l + le for l in dashboard_component.split(le)]
    lines[app_line:app_line] = insert_lines

# ============================================================
# PATCH 3: Add Dashboard tab to navbars
# ============================================================
# Desktop navbar
for i, line in enumerate(lines):
    if "setMode('history')" in line and 'hidden md:flex' not in line:
        # Check surrounding
        for j in range(i, min(i+10, len(lines))):
            if '</button>' in lines[j]:
                dashboard_btn = (
                    "           <button " + le +
                    "             onClick={() => setMode('dashboard')}" + le +
                    "             className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${mode === 'dashboard' ? 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}" + le +
                    "           >" + le +
                    "             \u7d71\u8a08\u5831\u8868" + le +  # 統計報表
                    "           </button>" + le
                )
                lines.insert(j+1, dashboard_btn)
                break
        break

# Mobile navbar
for i, line in enumerate(lines):
    if "setMode('history')" in line and 'md:hidden' in "".join(lines[max(0, i-10):i]):
        pass # Already handled by matching history if it's the second occurrence
        
# Actually, let's just use string replacement for the navbars to be safe
content = "".join(lines)
# Desktop tab insertion
content = content.replace(
    ">歷史紀錄</button>",
    ">歷史紀錄</button><button onClick={() => setMode('dashboard')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${mode === 'dashboard' ? 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>統計報表</button>"
)

# Mobile tab insertion
content = content.replace(
    ">歷史紀錄</button>",
    ">歷史紀錄</button><button onClick={() => setMode('dashboard')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'dashboard' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-500'}`}>統計報表</button>",
    1 # Only do once, the second one might differ in class
)

# Render mode
content = content.replace(
    "{mode === 'history' ? <HistoryView /> : (<>",
    "{mode === 'dashboard' ? <DashboardView /> : mode === 'history' ? <HistoryView /> : (<>"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Patched DashboardView into App.jsx")
