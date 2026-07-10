import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/lib/context';
import type { Employee, LabourAssignment, Project, QuoteLineItem } from '@/lib/types';
import { getItemCostBreakdown } from '@/lib/pricing';
import {
  fetchEmployees, upsertEmployee, deleteEmployee,
  fetchLabourAssignments, insertLabourAssignments, deleteLabourAssignment,
} from '@/lib/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, Users, HardHat,
  Search, Wrench, Check, ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const gbp = (n: number) =>
  '£' + (n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const itemLabel = (item: QuoteLineItem) =>
  `${item.itemRef || 'Item'} — ${item.type} ${item.widthMm}×${item.heightMm}mm`;

/** Labour amount allocated to one physical unit of this line item
 *  (the cost-side installation allocation from the quote builder). */
function unitLabourAllocation(item: QuoteLineItem, project: Project): number {
  return getItemCostBreakdown(item, project.settings, project.pricing).installation;
}

/** Split an amount across n people so shares sum exactly to the total. */
function splitAmount(total: number, n: number): number[] {
  const base = Math.floor((total / n) * 100) / 100;
  const shares = Array(n).fill(base);
  shares[n - 1] = Math.round((total - base * (n - 1)) * 100) / 100;
  return shares;
}

interface UnitOption {
  lineItemId: string;
  unitIndex: number;
  label: string;
  labour: number;
}

export default function LabourPage() {
  const { projects, loading: appLoading } = useApp();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<LabourAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(dateKey(today));
  const [assignOpen, setAssignOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [emps, asgs] = await Promise.all([fetchEmployees(), fetchLabourAssignments()]);
        setEmployees(emps);
        setAssignments(asgs);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load labour data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const wonQuotes = useMemo(
    () => projects.filter(p => p.status === 'won' && !p.settings?.supplyOnly),
    [projects]
  );

  // A unit is unavailable once any crew has been credited for it
  const assignedUnits = useMemo(() => {
    const set = new Set<string>();
    assignments.forEach(a => {
      if (a.kind === 'item' && a.lineItemId) set.add(`${a.lineItemId}#${a.unitIndex}`);
    });
    return set;
  }, [assignments]);

  const byDay = useMemo(() => {
    const map: Record<string, LabourAssignment[]> = {};
    assignments.forEach(a => { (map[a.workDate] = map[a.workDate] || []).push(a); });
    return map;
  }, [assignments]);

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const monthTotal = assignments
    .filter(a => a.workDate.startsWith(monthPrefix))
    .reduce((s, a) => s + a.labourAmount, 0);

  const empName = (id: string) => employees.find(e => e.id === id)?.name || 'Unknown';

  /* ── mutations ── */

  const handleLogAssignments = async (newOnes: LabourAssignment[]) => {
    try {
      await insertLabourAssignments(newOnes);
      setAssignments(prev => [...newOnes, ...prev]);
      setAssignOpen(false);
      toast.success(`${newOnes.length} record${newOnes.length === 1 ? '' : 's'} logged`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to log work');
    }
  };

  const handleRemoveAssignment = async (id: string) => {
    try {
      await deleteLabourAssignment(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
      toast.success('Record removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove record');
    }
  };

  const handleAddEmployee = async (name: string, role: string) => {
    const emp: Employee = {
      id: crypto.randomUUID(), name, role: role || 'Fitter',
      active: true, createdAt: new Date().toISOString(),
    };
    try {
      await upsertEmployee(emp);
      setEmployees(prev => [...prev, emp].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success(`${name} added`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to add employee');
    }
  };

  const handleToggleActive = async (emp: Employee) => {
    const updated = { ...emp, active: !emp.active };
    try {
      await upsertEmployee(updated);
      setEmployees(prev => prev.map(e => (e.id === emp.id ? updated : e)));
    } catch (err) {
      console.error(err);
      toast.error('Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (emp: Employee) => {
    if (assignments.some(a => a.employeeId === emp.id)) {
      toast.error(`${emp.name} has logged work — mark them inactive instead.`);
      return;
    }
    try {
      await deleteEmployee(emp.id);
      setEmployees(prev => prev.filter(e => e.id !== emp.id));
      toast.success(`${emp.name} removed`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove employee');
    }
  };

  /* ── calendar grid ── */

  const first = new Date(viewYear, viewMonth, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewYear, viewMonth, i + 1)),
  ];

  const nav = (dir: number) => {
    let m = viewMonth + dir, y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m); setViewYear(y);
  };

  const dayAssignments = byDay[selectedDay] || [];
  const todayKey = dateKey(new Date());

  if (loading || appLoading) {
    return <div className="text-sm text-muted-foreground py-12 text-center">Loading labour data…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <HardHat className="w-6 h-6 text-primary" /> Labour
          </h1>
          <p className="text-sm text-muted-foreground">
            Log installed windows & doors from won quotes — plus any extra manual works — and credit the labour to your fitters.
          </p>
        </div>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar" className="gap-1.5"><CalendarDays className="w-4 h-4" /> Calendar</TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5"><Users className="w-4 h-4" /> Team</TabsTrigger>
        </TabsList>

        {/* ─────────── CALENDAR TAB ─────────── */}
        <TabsContent value="calendar" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => nav(-1)} aria-label="Previous month">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <CardTitle className="font-heading text-lg w-44 text-center">
                      {MONTHS[viewMonth]} {viewYear}
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => nav(1)} aria-label="Next month">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <Badge variant="secondary">Month labour: {gbp(monthTotal)}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  {DOW.map(d => <div key={d} className="text-center py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((d, i) => {
                    if (!d) return <div key={`x${i}`} />;
                    const key = dateKey(d);
                    const list = byDay[key] || [];
                    const val = list.reduce((s, a) => s + a.labourAmount, 0);
                    const selected = key === selectedDay;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDay(key)}
                        className={`min-h-16 rounded-md border p-1 text-left flex flex-col transition-colors ${
                          selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <span className={`text-xs font-semibold ${key === todayKey ? 'text-primary' : 'text-muted-foreground'}`}>
                          {d.getDate()}
                        </span>
                        {list.length > 0 && (
                          <span className="mt-auto text-[10px] leading-tight bg-primary text-primary-foreground rounded px-1 py-0.5 self-start">
                            {list.length} · {gbp(val)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Day panel */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="font-heading text-lg">
                    {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-GB', {
                      weekday: 'long', day: 'numeric', month: 'short',
                    })}
                  </CardTitle>
                  <Button size="sm" onClick={() => setAssignOpen(true)} className="gap-1">
                    <Plus className="w-4 h-4" /> Log work
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {dayAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No work logged on this day.</p>
                ) : (
                  <ul className="space-y-2">
                    {dayAssignments.map(a => (
                      <li key={a.id} className="border rounded-md p-2 text-sm">
                        <div className="flex justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium truncate flex items-center gap-1.5">
                              {a.kind === 'extra' && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 gap-0.5">
                                  <Wrench className="w-2.5 h-2.5" /> Extra
                                </Badge>
                              )}
                              <span className="truncate">{a.itemDesc}</span>
                            </div>
                            {(a.quoteRef || a.clientName) && (
                              <div className="text-xs text-muted-foreground truncate">
                                {a.quoteRef}{a.clientName ? ` — ${a.clientName}` : ''}
                              </div>
                            )}
                            <div className="text-xs mt-1">
                              <span className="text-muted-foreground">Fitted by </span>
                              <span className="font-medium text-primary">{empName(a.employeeId)}</span>
                              <span className="text-muted-foreground"> · </span>
                              <span className="font-semibold">{gbp(a.labourAmount)}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost" size="icon"
                            className="text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => handleRemoveAssignment(a.id)}
                            aria-label="Remove record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                    <li className="text-right text-sm font-semibold pt-2 border-t">
                      Day total: {gbp(dayAssignments.reduce((s, a) => s + a.labourAmount, 0))}
                    </li>
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─────────── TEAM TAB ─────────── */}
        <TabsContent value="team" className="mt-4 space-y-6">
          <AddEmployeeForm onAdd={handleAddEmployee} />
          <div className="grid gap-4 lg:grid-cols-2">
            {employees.length === 0 && (
              <p className="text-sm text-muted-foreground">No employees yet — add your fitters above.</p>
            )}
            {employees.map(emp => {
              const mine = assignments.filter(a => a.employeeId === emp.id);
              const month = mine.filter(a => a.workDate.startsWith(monthPrefix));
              const sum = (list: LabourAssignment[]) => list.reduce((s, a) => s + a.labourAmount, 0);
              return (
                <Card key={emp.id} className={emp.active ? '' : 'opacity-60'}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="font-heading font-semibold truncate">{emp.name}</div>
                        <div className="text-xs text-muted-foreground">{emp.role}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Switch
                          checked={emp.active}
                          onCheckedChange={() => handleToggleActive(emp)}
                          aria-label={`${emp.name} active`}
                        />
                        <Button
                          variant="ghost" size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteEmployee(emp)}
                          aria-label={`Remove ${emp.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                      <div className="bg-primary/5 rounded-md p-2">
                        <div className="text-xs text-muted-foreground">{MONTHS[viewMonth]}</div>
                        <div className="font-semibold text-primary">{gbp(sum(month))}</div>
                        <div className="text-xs text-muted-foreground">
                          {month.length} record{month.length === 1 ? '' : 's'}
                        </div>
                      </div>
                      <div className="bg-muted rounded-md p-2">
                        <div className="text-xs text-muted-foreground">All time</div>
                        <div className="font-semibold">{gbp(sum(mine))}</div>
                        <div className="text-xs text-muted-foreground">
                          {mine.length} record{mine.length === 1 ? '' : 's'}
                        </div>
                      </div>
                    </div>
                    {mine.length > 0 && (
                      <div className="mt-3 border rounded-md max-h-56 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="h-8">Project</TableHead>
                              <TableHead className="h-8">Date</TableHead>
                              <TableHead className="h-8 text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[...mine]
                              .sort((a, b) => b.workDate.localeCompare(a.workDate))
                              .map(a => (
                                <TableRow key={a.id}>
                                  <TableCell className="py-1.5 text-xs">
                                    <span className="font-medium">
                                      {a.quoteRef || (a.kind === 'extra' ? 'Extra' : '—')}
                                    </span>
                                    <span className="block text-muted-foreground truncate max-w-40">
                                      {a.itemDesc}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-1.5 text-xs whitespace-nowrap">
                                    {new Date(a.workDate + 'T00:00:00').toLocaleDateString('en-GB', {
                                      day: '2-digit', month: 'short', year: '2-digit',
                                    })}
                                  </TableCell>
                                  <TableCell className="py-1.5 text-xs text-right font-medium">
                                    {gbp(a.labourAmount)}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                          <TableFooter>
                            <TableRow>
                              <TableCell colSpan={2} className="py-1.5 text-xs font-semibold">Total</TableCell>
                              <TableCell className="py-1.5 text-xs text-right font-semibold">{gbp(sum(mine))}</TableCell>
                            </TableRow>
                          </TableFooter>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {assignOpen && (
        <LogWorkDialog
          date={selectedDay}
          quotes={wonQuotes}
          employees={employees.filter(e => e.active)}
          assignedUnits={assignedUnits}
          onClose={() => setAssignOpen(false)}
          onSave={handleLogAssignments}
        />
      )}
    </div>
  );
}

/* ─────────── Add employee form ─────────── */
function AddEmployeeForm({ onAdd }: { onAdd: (name: string, role: string) => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-lg">Add employee</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="Name" className="flex-1 min-w-40"
        />
        <Input
          value={role} onChange={e => setRole(e.target.value)}
          placeholder="Role (default: Fitter)" className="flex-1 min-w-40"
        />
        <Button
          onClick={() => { if (name.trim()) { onAdd(name.trim(), role.trim()); setName(''); setRole(''); } }}
          disabled={!name.trim()}
          className="gap-1"
        >
          <Plus className="w-4 h-4" /> Add
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─────────── Multi-select fitter list ─────────── */
function FitterPicker({
  employees, selected, onToggle,
}: {
  employees: Employee[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (employees.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No active employees — add them in the Team tab first.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {employees.map(e => {
        const isOn = selected.has(e.id);
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => onToggle(e.id)}
            className={`flex items-center gap-1.5 border rounded-full px-3 py-1.5 text-sm transition-colors ${
              isOn
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:border-primary/50'
            }`}
          >
            {isOn && <Check className="w-3.5 h-3.5" />}
            {e.name}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────── Log work dialog ─────────── */
interface UnitKeyed extends UnitOption { key: string }

function LogWorkDialog({
  date, quotes, employees, assignedUnits, onClose, onSave,
}: {
  date: string;
  quotes: Project[];
  employees: Employee[];
  assignedUnits: Set<string>;
  onClose: () => void;
  onSave: (assignments: LabourAssignment[]) => void;
}) {
  const [mode, setMode] = useState<'items' | 'extra'>('items');

  // shared
  const [fitters, setFitters] = useState<Set<string>>(new Set());
  const [splitEqually, setSplitEqually] = useState(true);

  // quote picker (searchable)
  const [search, setSearch] = useState('');
  const [quoteId, setQuoteId] = useState('');
  const quote = quotes.find(q => q.id === quoteId);

  // items mode
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());

  // extra mode
  const [extraDesc, setExtraDesc] = useState('');
  const [extraAmount, setExtraAmount] = useState('');
  const [linkQuote, setLinkQuote] = useState(false);

  const filteredQuotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return quotes;
    return quotes.filter(p =>
      p.projectRef.toLowerCase().includes(q) || (p.client || '').toLowerCase().includes(q)
    );
  }, [quotes, search]);

  const availableUnits: UnitKeyed[] = useMemo(() => {
    if (!quote) return [];
    const units: UnitKeyed[] = [];
    for (const item of quote.lineItems) {
      const labour = unitLabourAllocation(item, quote);
      const qty = Math.max(1, item.qty || 1);
      for (let u = 1; u <= qty; u++) {
        if (assignedUnits.has(`${item.id}#${u}`)) continue;
        units.push({
          key: `${item.id}#${u}`,
          lineItemId: item.id,
          unitIndex: u,
          label: itemLabel(item) + (qty > 1 ? ` (unit ${u}/${qty})` : ''),
          labour,
        });
      }
    }
    return units;
  }, [quote, assignedUnits]);

  const toggleUnit = (key: string) =>
    setSelectedUnits(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const toggleFitter = (id: string) =>
    setFitters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const fitterIds = [...fitters];
  const nFitters = fitterIds.length;

  const chosenUnits = availableUnits.filter(u => selectedUnits.has(u.key));
  const itemsTotal = chosenUnits.reduce((s, u) => s + u.labour, 0);
  const extraAmountNum = Math.round((parseFloat(extraAmount) || 0) * 100) / 100;

  const workTotal = mode === 'items' ? itemsTotal : extraAmountNum;
  const payoutTotal = splitEqually ? workTotal : workTotal * Math.max(1, nFitters);

  const canSave =
    nFitters > 0 &&
    (mode === 'items'
      ? !!quote && chosenUnits.length > 0
      : extraDesc.trim().length > 0 && extraAmountNum > 0);

  const save = () => {
    const now = new Date().toISOString();
    const records: LabourAssignment[] = [];

    if (mode === 'items' && quote) {
      for (const u of chosenUnits) {
        const shares = splitEqually ? splitAmount(u.labour, nFitters) : fitterIds.map(() => u.labour);
        fitterIds.forEach((empId, i) => {
          records.push({
            id: crypto.randomUUID(),
            workDate: date,
            kind: 'item',
            quoteId: quote.id,
            quoteRef: quote.projectRef,
            clientName: quote.client,
            lineItemId: u.lineItemId,
            unitIndex: u.unitIndex,
            itemDesc: u.label,
            employeeId: empId,
            labourAmount: shares[i],
            createdAt: now,
          });
        });
      }
    } else if (mode === 'extra') {
      const shares = splitEqually
        ? splitAmount(extraAmountNum, nFitters)
        : fitterIds.map(() => extraAmountNum);
      const linked = linkQuote ? quote : undefined;
      fitterIds.forEach((empId, i) => {
        records.push({
          id: crypto.randomUUID(),
          workDate: date,
          kind: 'extra',
          quoteId: linked?.id ?? null,
          quoteRef: linked?.projectRef ?? '',
          clientName: linked?.client ?? '',
          lineItemId: null,
          unitIndex: null,
          itemDesc: extraDesc.trim(),
          employeeId: empId,
          labourAmount: shares[i],
          createdAt: now,
        });
      });
    }
    onSave(records);
  };

  const quotePicker = (
    <div className="space-y-1.5">
      <Label>{mode === 'items' ? 'Won quote' : 'Link to quote (optional)'}</Label>
      {quote ? (
        <div className="flex items-center justify-between border rounded-md px-3 py-2 text-sm bg-primary/5 border-primary">
          <span className="min-w-0 truncate font-medium">
            {quote.projectRef} — {quote.client}
          </span>
          <Button
            variant="ghost" size="sm" className="gap-1 shrink-0 h-7"
            onClick={() => { setQuoteId(''); setSelectedUnits(new Set()); setSearch(''); }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Change
          </Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by quote ref or client…"
              className="pl-8"
            />
          </div>
          <ul className="border rounded-md divide-y max-h-44 overflow-y-auto">
            {filteredQuotes.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                {quotes.length === 0 ? 'No won quotes yet.' : 'No quotes match your search.'}
              </li>
            )}
            {filteredQuotes.map(q => (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => { setQuoteId(q.id); setSelectedUnits(new Set()); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <span className="font-medium">{q.projectRef}</span>
                  <span className="text-muted-foreground"> — {q.client}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">
            Log work — {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={v => setMode(v as 'items' | 'extra')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="items">Quote items</TabsTrigger>
            <TabsTrigger value="extra" className="gap-1.5"><Wrench className="w-3.5 h-3.5" /> Manual extra</TabsTrigger>
          </TabsList>

          {/* ITEMS MODE */}
          <TabsContent value="items" className="space-y-4 mt-4">
            {quotePicker}
            {quote && (
              <div className="space-y-1.5">
                <Label>Items installed ({availableUnits.length} remaining on this quote)</Label>
                {availableUnits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Every unit on this quote has already been logged as installed.
                  </p>
                ) : (
                  <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {availableUnits.map(u => {
                      const isOn = selectedUnits.has(u.key);
                      return (
                        <li key={u.key}>
                          <button
                            type="button"
                            onClick={() => toggleUnit(u.key)}
                            className={`w-full flex items-center justify-between gap-2 border rounded-md px-3 py-2 text-sm text-left transition-colors ${
                              isOn ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <span className="min-w-0 truncate">{u.label}</span>
                            <span className="font-medium shrink-0">{gbp(u.labour)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </TabsContent>

          {/* EXTRA MODE */}
          <TabsContent value="extra" className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>Description of the work</Label>
              <Input
                value={extraDesc}
                onChange={e => setExtraDesc(e.target.value)}
                placeholder="e.g. Rebuild rotten sub-frame, extra making good…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Labour amount (£)</Label>
              <Input
                value={extraAmount}
                onChange={e => setExtraAmount(e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={linkQuote} onCheckedChange={v => { setLinkQuote(v); if (!v) { setQuoteId(''); setSearch(''); } }} id="link-quote" />
              <Label htmlFor="link-quote" className="cursor-pointer">Link this work to a quote</Label>
            </div>
            {linkQuote && quotePicker}
          </TabsContent>
        </Tabs>

        {/* FITTERS (shared) */}
        <div className="space-y-2 pt-1">
          <Label>Fitted by {nFitters > 1 ? `(${nFitters} fitters)` : ''}</Label>
          <FitterPicker employees={employees} selected={fitters} onToggle={toggleFitter} />
          {nFitters > 1 && (
            <div className="flex items-center justify-between border rounded-md px-3 py-2">
              <div className="flex items-center gap-2">
                <Switch checked={splitEqually} onCheckedChange={setSplitEqually} id="split-eq" />
                <Label htmlFor="split-eq" className="cursor-pointer text-sm">
                  {splitEqually ? 'Split allocation equally' : 'Full amount to each fitter'}
                </Label>
              </div>
              <span className="text-xs text-muted-foreground">
                {splitEqually
                  ? `≈ ${gbp(workTotal / nFitters)} each`
                  : `${gbp(workTotal)} each`}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            Total payout: <span className="font-semibold text-foreground">{gbp(payoutTotal)}</span>
          </span>
          <Button onClick={save} disabled={!canSave}>Log work</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
