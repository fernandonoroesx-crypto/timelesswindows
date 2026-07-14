import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/lib/context';
import type { Employee, LabourAssignment, LabourBooking, LabourHoliday, Project, QuoteLineItem } from '@/lib/types';
import { getItemCostBreakdown } from '@/lib/pricing';
import {
  fetchEmployees, upsertEmployee, deleteEmployee,
  fetchLabourAssignments, insertLabourAssignments, deleteLabourAssignment,
  fetchLabourBookings, insertLabourBooking, deleteLabourBooking,
  fetchLabourHolidays, insertLabourHoliday, deleteLabourHoliday,
} from '@/lib/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, Users, HardHat,
  Search, Wrench, Check, ArrowLeft, Sun, CalendarPlus, Filter, X, Palmtree, AlertTriangle,
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
  const [bookOpen, setBookOpen] = useState(false);
  const [bookings, setBookings] = useState<LabourBooking[]>([]);
  const [holidays, setHolidays] = useState<LabourHoliday[]>([]);

  // calendar filters
  const [filterEmp, setFilterEmp] = useState<string>('all');
  const [filterRef, setFilterRef] = useState<string>('all');
  const [displayMode, setDisplayMode] = useState<'money' | 'ref' | 'fitters'>('money');

  // team report filters
  const [tEmp, setTEmp] = useState('all');
  const [tRef, setTRef] = useState('all');
  const [tType, setTType] = useState('all');
  const [tMonth, setTMonth] = useState(''); // '' = all, else 'YYYY-MM'

  useEffect(() => {
    (async () => {
      try {
        const [emps, asgs, bks, hols] = await Promise.all([fetchEmployees(), fetchLabourAssignments(), fetchLabourBookings(), fetchLabourHolidays()]);
        setEmployees(emps);
        setAssignments(asgs);
        setBookings(bks);
        setHolidays(hols);
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

  const filteredAssignments = useMemo(
    () => assignments.filter(a =>
      (filterEmp === 'all' || a.employeeId === filterEmp) &&
      (filterRef === 'all' || a.quoteRef === filterRef)
    ),
    [assignments, filterEmp, filterRef]
  );

  const filteredBookings = useMemo(
    () => bookings.filter(b =>
      (filterEmp === 'all' || b.employeeIds.includes(filterEmp)) &&
      (filterRef === 'all' || b.quoteRef === filterRef)
    ),
    [bookings, filterEmp, filterRef]
  );

  const byDay = useMemo(() => {
    const map: Record<string, LabourAssignment[]> = {};
    filteredAssignments.forEach(a => { (map[a.workDate] = map[a.workDate] || []).push(a); });
    return map;
  }, [filteredAssignments]);

  const bookingsByDay = useMemo(() => {
    const map: Record<string, LabourBooking[]> = {};
    filteredBookings.forEach(b => { (map[b.bookDate] = map[b.bookDate] || []).push(b); });
    return map;
  }, [filteredBookings]);

  // refs available for the filter (from records and bookings)
  const refOptions = useMemo(() => {
    const set = new Set<string>();
    assignments.forEach(a => { if (a.quoteRef) set.add(a.quoteRef); });
    bookings.forEach(b => { if (b.quoteRef) set.add(b.quoteRef); });
    return [...set].sort();
  }, [assignments, bookings]);

  const isOnHoliday = (empId: string, date: string) =>
    holidays.some(h => h.employeeId === empId && h.startDate <= date && date <= h.endDate);

  const holidayIdsForSelectedDay = useMemo(
    () => new Set(employees.filter(e => isOnHoliday(e.id, selectedDay)).map(e => e.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees, holidays, selectedDay]);

  const reportRows = useMemo(() =>
    assignments
      .filter(a =>
        (tEmp === 'all' || a.employeeId === tEmp) &&
        (tRef === 'all' || a.quoteRef === tRef) &&
        (tType === 'all' || a.kind === tType) &&
        (tMonth === '' || a.workDate.startsWith(tMonth))
      )
      .sort((a, b) => b.workDate.localeCompare(a.workDate)),
    [assignments, tEmp, tRef, tType, tMonth]);
  const reportTotal = reportRows.reduce((s, a) => s + a.labourAmount, 0);

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const monthTotal = filteredAssignments
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

  const handleAddBooking = async (b: LabourBooking) => {
    try {
      await insertLabourBooking(b);
      setBookings(prev => [...prev, b]);
      setBookOpen(false);
      toast.success(`${b.quoteRef} booked`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to book job');
    }
  };

  const handleRemoveBooking = async (id: string) => {
    try {
      await deleteLabourBooking(id);
      setBookings(prev => prev.filter(b => b.id !== id));
      toast.success('Booking removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove booking');
    }
  };

  const handleAddHoliday = async (h: LabourHoliday) => {
    try {
      await insertLabourHoliday(h);
      setHolidays(prev => [...prev, h].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      toast.success('Holiday scheduled');
    } catch (err) {
      console.error(err);
      toast.error('Failed to schedule holiday');
    }
  };

  const handleRemoveHoliday = async (id: string) => {
    try {
      await deleteLabourHoliday(id);
      setHolidays(prev => prev.filter(h => h.id !== id));
      toast.success('Holiday removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove holiday');
    }
  };

  const handleAddEmployee = async (name: string, role: string, dayRate: number) => {
    const emp: Employee = {
      id: crypto.randomUUID(), name, role: role || 'Fitter', dayRate,
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

  const handleUpdateDayRate = async (emp: Employee, rate: number) => {
    const updated = { ...emp, dayRate: rate };
    try {
      await upsertEmployee(updated);
      setEmployees(prev => prev.map(e => (e.id === emp.id ? updated : e)));
    } catch (err) {
      console.error(err);
      toast.error('Failed to update day rate');
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
          <TabsTrigger value="holidays" className="gap-1.5"><Palmtree className="w-4 h-4" /> Holidays</TabsTrigger>
        </TabsList>

        {/* ─────────── CALENDAR TAB ─────────── */}
        <TabsContent value="calendar" className="mt-4 space-y-4">
          {/* filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterEmp} onValueChange={setFilterEmp}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterRef} onValueChange={setFilterRef}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All work refs</SelectItem>
                {refOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            {(filterEmp !== 'all' || filterRef !== 'all') && (
              <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground"
                onClick={() => { setFilterEmp('all'); setFilterRef('all'); }}>
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
            <div className="ml-auto flex rounded-md border overflow-hidden text-xs font-medium">
              {([['money', '£ Money'], ['ref', 'Work ref'], ['fitters', 'Fitters']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setDisplayMode(key)}
                  className={`px-3 py-1.5 transition-colors ${
                    displayMode === key ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            <Card className="lg:col-span-3">
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
                <div className="grid grid-cols-7 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  {DOW.map(d => <div key={d} className="text-center py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((d, i) => {
                    if (!d) return <div key={`x${i}`} />;
                    const key = dateKey(d);
                    const list = byDay[key] || [];
                    const booked = bookingsByDay[key] || [];
                    const val = list.reduce((s, a) => s + a.labourAmount, 0);
                    const selected = key === selectedDay;

                    const summarize = (items: string[]) => {
                      const uniq = [...new Set(items.filter(Boolean))];
                      return uniq.slice(0, 2).join(', ') + (uniq.length > 2 ? ` +${uniq.length - 2}` : '');
                    };
                    const loggedLabel =
                      displayMode === 'money' ? `${list.length} · ${gbp(val)}`
                      : displayMode === 'ref' ? summarize(list.map(a => a.quoteRef || (a.kind === 'day' ? 'Day' : 'Extra')))
                      : summarize(list.map(a => empName(a.employeeId).split(' ')[0]));
                    const cellHolidayNames = employees
                      .filter(e => e.active && isOnHoliday(e.id, key))
                      .map(e => e.name.split(' ')[0]);
                    const bookedLabel =
                      displayMode === 'fitters'
                        ? summarize(booked.flatMap(b => b.employeeIds.map(id => empName(id).split(' ')[0])))
                          || `${booked.length} booked`
                        : summarize(booked.map(b => b.quoteRef));

                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDay(key)}
                        className={`min-h-24 sm:min-h-28 rounded-md border p-1.5 text-left flex flex-col gap-1 transition-colors ${
                          selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <span className={`text-sm font-semibold ${key === todayKey ? 'text-primary' : 'text-muted-foreground'}`}>
                          {d.getDate()}
                        </span>
                        <span className="mt-auto flex flex-col gap-0.5 items-start">
                          {cellHolidayNames.length > 0 && (
                            <span className="text-[11px] leading-snug bg-rose-50 text-rose-700 border border-rose-200 rounded px-1 py-0.5 max-w-full truncate">
                              🌴 {displayMode === 'fitters'
                                ? cellHolidayNames.slice(0, 2).join(', ') + (cellHolidayNames.length > 2 ? ` +${cellHolidayNames.length - 2}` : '')
                                : `${cellHolidayNames.length} away`}
                            </span>
                          )}
                          {booked.length > 0 && (
                            <span className="text-[11px] leading-snug border border-dashed border-amber-500 text-amber-700 bg-amber-50 rounded px-1 py-0.5 max-w-full truncate">
                              {bookedLabel}
                            </span>
                          )}
                          {list.length > 0 && (
                            <span className="text-[11px] leading-snug bg-primary text-primary-foreground rounded px-1 py-0.5 max-w-full truncate">
                              {loggedLabel}
                            </span>
                          )}
                        </span>
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
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setBookOpen(true)} className="gap-1">
                      <CalendarPlus className="w-4 h-4" /> Book
                    </Button>
                    <Button size="sm" onClick={() => setAssignOpen(true)} className="gap-1">
                      <Plus className="w-4 h-4" /> Log work
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {holidayIdsForSelectedDay.size > 0 && (
                  <div className="mb-3 flex items-start gap-2 text-xs bg-destructive/10 text-destructive rounded-md px-2.5 py-2">
                    <Palmtree className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      On holiday today: {employees.filter(e => holidayIdsForSelectedDay.has(e.id)).map(e => e.name).join(', ')}
                    </span>
                  </div>
                )}
                {(bookingsByDay[selectedDay] || []).length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-1.5">Booked</div>
                    <ul className="space-y-2">
                      {(bookingsByDay[selectedDay] || []).map(b => (
                        <li key={b.id} className="border border-dashed border-amber-400 bg-amber-50/50 rounded-md p-2 text-sm">
                          <div className="flex justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{b.quoteRef} — {b.clientName}</div>
                              {b.employeeIds.length > 0 && (
                                <div className="text-xs text-muted-foreground truncate">
                                  Crew: {b.employeeIds.map(id => empName(id)).join(', ')}
                                </div>
                              )}
                              {b.employeeIds.some(id => holidayIdsForSelectedDay.has(id)) && (
                                <div className="text-xs text-destructive flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  {b.employeeIds.filter(id => holidayIdsForSelectedDay.has(id)).map(id => empName(id)).join(', ')} now on holiday this day
                                </div>
                              )}
                              {b.note && <div className="text-xs text-muted-foreground truncate">{b.note}</div>}
                            </div>
                            <Button
                              variant="ghost" size="icon"
                              className="text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => handleRemoveBooking(b.id)}
                              aria-label="Remove booking"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {dayAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {(bookingsByDay[selectedDay] || []).length > 0 ? 'Nothing logged yet on this day.' : 'No work logged on this day.'}
                  </p>
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
                              {a.kind === 'day' && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 gap-0.5">
                                  <Sun className="w-2.5 h-2.5" /> Day
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
          <AddEmployeeForm onAdd={handleAddEmployee} existingRoles={employees.map(e => e.role)} />

          {/* Employees table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-lg">Employees</CardTitle>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <p className="text-sm text-muted-foreground">No employees yet — add your fitters above.</p>
              ) : (
                <div className="border rounded-md overflow-x-auto">
                  <Table className="text-sm [&_th]:border [&_td]:border [&_th]:px-2 [&_td]:px-2 [&_th]:h-8 [&_td]:py-1.5">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Day rate</TableHead>
                        <TableHead className="text-right">{MONTHS[viewMonth]}</TableHead>
                        <TableHead className="text-right">All time</TableHead>
                        <TableHead className="text-center">Records</TableHead>
                        <TableHead className="text-center">Active</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map(emp => {
                        const mine = assignments.filter(a => a.employeeId === emp.id);
                        const month = mine.filter(a => a.workDate.startsWith(monthPrefix));
                        const sum = (l: LabourAssignment[]) => l.reduce((s, a) => s + a.labourAmount, 0);
                        return (
                          <TableRow key={emp.id} className={emp.active ? '' : 'opacity-60'}>
                            <TableCell className="font-medium whitespace-nowrap">{emp.name}</TableCell>
                            <TableCell className="whitespace-nowrap">{emp.role}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number" min="0" step="0.01"
                                defaultValue={emp.dayRate || ''}
                                placeholder="0.00"
                                className="h-7 w-24 text-xs text-right ml-auto"
                                onBlur={e => {
                                  const v = Math.round((parseFloat(e.target.value) || 0) * 100) / 100;
                                  if (v !== emp.dayRate) handleUpdateDayRate(emp, v);
                                }}
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium text-primary">{gbp(sum(month))}</TableCell>
                            <TableCell className="text-right font-medium">{gbp(sum(mine))}</TableCell>
                            <TableCell className="text-center">{mine.length}</TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={emp.active}
                                onCheckedChange={() => handleToggleActive(emp)}
                                aria-label={`${emp.name} active`}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteEmployee(emp)}
                                aria-label={`Remove ${emp.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Work report */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-lg">Work report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* report filters */}
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={tEmp} onValueChange={setTEmp}>
                  <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All employees</SelectItem>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={tRef} onValueChange={setTRef}>
                  <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All work refs</SelectItem>
                    {refOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={tType} onValueChange={setTType}>
                  <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="item">Items</SelectItem>
                    <SelectItem value="extra">Extras</SelectItem>
                    <SelectItem value="day">Day work</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="month"
                  value={tMonth}
                  onChange={e => setTMonth(e.target.value)}
                  className="w-40 h-9"
                />
                {(tEmp !== 'all' || tRef !== 'all' || tType !== 'all' || tMonth !== '') && (
                  <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground"
                    onClick={() => { setTEmp('all'); setTRef('all'); setTType('all'); setTMonth(''); }}>
                    <X className="w-3.5 h-3.5" /> Clear
                  </Button>
                )}
              </div>

              {reportRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No records match these filters.</p>
              ) : (
                <div className="border rounded-md overflow-x-auto max-h-[28rem] overflow-y-auto">
                  <Table className="text-sm [&_th]:border [&_td]:border [&_th]:px-2 [&_td]:px-2 [&_th]:h-8 [&_td]:py-1.5">
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow className="bg-muted/50">
                        <TableHead>Date</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportRows.map(a => (
                        <TableRow key={a.id}>
                          <TableCell className="whitespace-nowrap">
                            {new Date(a.workDate + 'T00:00:00').toLocaleDateString('en-GB', {
                              day: '2-digit', month: 'short', year: '2-digit',
                            })}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{empName(a.employeeId)}</TableCell>
                          <TableCell className="whitespace-nowrap">{a.quoteRef || '—'}</TableCell>
                          <TableCell className="max-w-56 truncate">{a.itemDesc}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {a.kind === 'item' ? 'Item' : a.kind === 'extra' ? 'Extra' : 'Day work'}
                          </TableCell>
                          <TableCell className="text-right font-medium">{gbp(a.labourAmount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={5} className="font-semibold">
                          Total ({reportRows.length} record{reportRows.length === 1 ? '' : 's'})
                        </TableCell>
                        <TableCell className="text-right font-semibold">{gbp(reportTotal)}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────── HOLIDAYS TAB ─────────── */}
        <TabsContent value="holidays" className="mt-4 space-y-6">
          <ScheduleHolidayForm employees={employees} onAdd={handleAddHoliday} />

          {/* Availability chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="font-heading text-lg">Team availability</CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => nav(-1)} aria-label="Previous month">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="font-heading font-semibold w-40 text-center">{MONTHS[viewMonth]} {viewYear}</span>
                  <Button variant="ghost" size="icon" onClick={() => nav(1)} aria-label="Next month">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Holiday</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Booked</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Worked</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-muted inline-block border" /> Available</span>
              </div>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add employees in the Team tab first.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="text-left pr-2 py-1 font-medium text-muted-foreground sticky left-0 bg-background">Employee</th>
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const d = new Date(viewYear, viewMonth, i + 1);
                          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                          return (
                            <th key={i} className={`w-6 text-center font-normal py-1 ${isWeekend ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                              {i + 1}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {employees.filter(e => e.active).map(emp => (
                        <tr key={emp.id}>
                          <td className="pr-2 py-0.5 font-medium whitespace-nowrap sticky left-0 bg-background">{emp.name}</td>
                          {Array.from({ length: daysInMonth }, (_, i) => {
                            const d = new Date(viewYear, viewMonth, i + 1);
                            const key = dateKey(d);
                            const holiday = isOnHoliday(emp.id, key);
                            const worked = assignments.some(a => a.employeeId === emp.id && a.workDate === key);
                            const bookedDay = bookings.some(b => b.bookDate === key && b.employeeIds.includes(emp.id));
                            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                            const cls = holiday ? 'bg-red-400'
                              : worked ? 'bg-primary'
                              : bookedDay ? 'bg-amber-400'
                              : isWeekend ? 'bg-muted/40' : 'bg-muted';
                            const title = `${emp.name} — ${key}: ${holiday ? 'On holiday' : worked ? 'Worked' : bookedDay ? 'Booked' : 'Available'}`;
                            return (
                              <td key={i} className="p-0.5">
                                <button
                                  type="button"
                                  title={title}
                                  onClick={() => { setSelectedDay(key); }}
                                  className={`w-5 h-5 rounded-sm border border-background block ${cls}`}
                                  aria-label={title}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scheduled holidays table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-lg">Scheduled holidays</CardTitle>
            </CardHeader>
            <CardContent>
              {holidays.length === 0 ? (
                <p className="text-sm text-muted-foreground">No holidays scheduled.</p>
              ) : (
                <div className="border rounded-md overflow-x-auto">
                  <Table className="text-sm [&_th]:border [&_td]:border [&_th]:px-2 [&_td]:px-2 [&_th]:h-8 [&_td]:py-1.5">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Employee</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead className="text-center">Days</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holidays.map(h => {
                        const days = Math.round(
                          (new Date(h.endDate + 'T00:00:00').getTime() - new Date(h.startDate + 'T00:00:00').getTime()) / 86400000
                        ) + 1;
                        const fmt = (d: string) =>
                          new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
                        return (
                          <TableRow key={h.id}>
                            <TableCell className="font-medium whitespace-nowrap">{empName(h.employeeId)}</TableCell>
                            <TableCell className="whitespace-nowrap">{fmt(h.startDate)}</TableCell>
                            <TableCell className="whitespace-nowrap">{fmt(h.endDate)}</TableCell>
                            <TableCell className="text-center">{days}</TableCell>
                            <TableCell className="max-w-56 truncate">{h.note || '—'}</TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveHoliday(h.id)} aria-label="Remove holiday">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {bookOpen && (
        <BookJobDialog
          date={selectedDay}
          quotes={wonQuotes}
          employees={employees.filter(e => e.active)}
          assignedUnits={assignedUnits}
          holidayIds={holidayIdsForSelectedDay}
          onClose={() => setBookOpen(false)}
          onSave={handleAddBooking}
        />
      )}
      {assignOpen && (
        <LogWorkDialog
          date={selectedDay}
          quotes={wonQuotes}
          employees={employees.filter(e => e.active)}
          assignedUnits={assignedUnits}
          sameDay={assignments.filter(a => a.workDate === selectedDay)}
          holidayIds={holidayIdsForSelectedDay}
          onClose={() => setAssignOpen(false)}
          onSave={handleLogAssignments}
        />
      )}
    </div>
  );
}


/* ─────────── Schedule holiday form ─────────── */
function ScheduleHolidayForm({ employees, onAdd }: {
  employees: Employee[];
  onAdd: (h: LabourHoliday) => void;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');

  const canAdd = employeeId && from && to && to >= from;

  const submit = () => {
    if (!canAdd) return;
    onAdd({
      id: crypto.randomUUID(),
      employeeId,
      startDate: from,
      endDate: to,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    });
    setEmployeeId(''); setFrom(''); setTo(''); setNote('');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-lg">Schedule holiday</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 items-start">
        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Employee…" /></SelectTrigger>
          <SelectContent>
            {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
        <Input type="date" value={to} onChange={e => setTo(e.target.value)} min={from || undefined} className="w-40" />
        <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" className="flex-1 min-w-40" />
        <Button onClick={submit} disabled={!canAdd} className="gap-1">
          <Plus className="w-4 h-4" /> Schedule
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─────────── Add employee form ─────────── */
const DEFAULT_ROLES = ['Fitter', 'Apprentice', 'Labourer', 'Site Manager', 'Surveyor'];
const NEW_ROLE = '__new__';

function AddEmployeeForm({ onAdd, existingRoles }: {
  onAdd: (name: string, role: string, dayRate: number) => void;
  existingRoles: string[];
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Fitter');
  const [customRole, setCustomRole] = useState('');
  const [dayRate, setDayRate] = useState('');

  // Defaults plus any custom roles already in use
  const roles = useMemo(() => {
    const set = new Set(DEFAULT_ROLES);
    existingRoles.forEach(r => { if (r.trim()) set.add(r.trim()); });
    return [...set];
  }, [existingRoles]);

  const finalRole = role === NEW_ROLE ? customRole.trim() : role;
  const canAdd = name.trim().length > 0 && finalRole.length > 0;

  const submit = () => {
    if (!canAdd) return;
    onAdd(name.trim(), finalRole, Math.round((parseFloat(dayRate) || 0) * 100) / 100);
    setName('');
    setRole('Fitter');
    setCustomRole('');
    setDayRate('');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-lg">Add employee</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 items-start">
        <Input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="Name" className="flex-1 min-w-40"
        />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="flex-1 min-w-40">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
            <SelectItem value={NEW_ROLE}>
              <span className="flex items-center gap-1.5 text-primary">
                <Plus className="w-3.5 h-3.5" /> Add new role…
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        {role === NEW_ROLE && (
          <Input
            value={customRole} onChange={e => setCustomRole(e.target.value)}
            placeholder="New role name" className="flex-1 min-w-40" autoFocus
          />
        )}
        <Input
          value={dayRate} onChange={e => setDayRate(e.target.value)}
          placeholder="Day rate £ (optional)" inputMode="decimal" className="w-40"
        />
        <Button onClick={submit} disabled={!canAdd} className="gap-1">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─────────── Multi-select fitter list ─────────── */
function FitterPicker({
  employees, selected, onToggle, amounts, disabledIds,
}: {
  employees: Employee[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  amounts?: Record<string, string>;
  disabledIds?: Set<string>;
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
        const isOff = disabledIds?.has(e.id) ?? false;
        return (
          <button
            key={e.id}
            type="button"
            disabled={isOff}
            onClick={() => onToggle(e.id)}
            className={`flex items-center gap-1.5 border rounded-full px-3 py-1.5 text-sm transition-colors ${
              isOff
                ? 'border-border opacity-50 cursor-not-allowed'
                : isOn
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:border-primary/50'
            }`}
          >
            {isOn && <Check className="w-3.5 h-3.5" />}
            {e.name}
            {amounts && amounts[e.id] !== undefined && (
              <span className={`text-xs font-semibold ${isOn ? 'text-primary-foreground/85' : 'text-muted-foreground'}`}>
                · {amounts[e.id]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}


/* ─────────── Book job dialog ─────────── */
function BookJobDialog({
  date, quotes, employees, assignedUnits, holidayIds, onClose, onSave,
}: {
  date: string;
  quotes: Project[];
  employees: Employee[];
  assignedUnits: Set<string>;
  holidayIds: Set<string>;
  onClose: () => void;
  onSave: (b: LabourBooking) => void;
}) {
  const holidayAmounts = Object.fromEntries(
    employees.filter(e => holidayIds.has(e.id)).map(e => [e.id, 'on holiday'])
  );
  const [search, setSearch] = useState('');
  const [quoteId, setQuoteId] = useState('');
  const [crew, setCrew] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');

  // won quotes with units still to install ("works that need to be booked")
  const pending = useMemo(() => quotes
    .map(q => {
      const remaining = q.lineItems.reduce((s, it) => {
        const qty = Math.max(1, it.qty || 1);
        let r = 0;
        for (let u = 1; u <= qty; u++) if (!assignedUnits.has(`${it.id}#${u}`)) r++;
        return s + r;
      }, 0);
      return { q, remaining };
    })
    .filter(x => x.remaining > 0), [quotes, assignedUnits]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return pending;
    return pending.filter(({ q }) =>
      q.projectRef.toLowerCase().includes(s) || (q.client || '').toLowerCase().includes(s));
  }, [pending, search]);

  const quote = quotes.find(q => q.id === quoteId);

  const toggleCrew = (id: string) =>
    setCrew(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const save = () => {
    if (!quote) return;
    onSave({
      id: crypto.randomUUID(),
      bookDate: date,
      quoteId: quote.id,
      quoteRef: quote.projectRef,
      clientName: quote.client,
      employeeIds: [...crew],
      note: note.trim(),
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">
            Book job — {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Won jobs awaiting installation ({pending.length})</Label>
            {quote ? (
              <div className="flex items-center justify-between border rounded-md px-3 py-2 text-sm bg-primary/5 border-primary">
                <span className="min-w-0 truncate font-medium">{quote.projectRef} — {quote.client}</span>
                <Button variant="ghost" size="sm" className="gap-1 shrink-0 h-7"
                  onClick={() => { setQuoteId(''); setSearch(''); }}>
                  <ArrowLeft className="w-3.5 h-3.5" /> Change
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by quote ref or client…" className="pl-8" />
                </div>
                <ul className="border rounded-md divide-y max-h-48 overflow-y-auto">
                  {filtered.length === 0 && (
                    <li className="px-3 py-2 text-sm text-muted-foreground">
                      {pending.length === 0 ? 'Every won job is fully installed — nothing to book.' : 'No jobs match your search.'}
                    </li>
                  )}
                  {filtered.map(({ q, remaining }) => (
                    <li key={q.id}>
                      <button type="button" onClick={() => setQuoteId(q.id)}
                        className="w-full flex items-center justify-between gap-2 text-left px-3 py-2 text-sm hover:bg-muted transition-colors">
                        <span className="min-w-0 truncate">
                          <span className="font-medium">{q.projectRef}</span>
                          <span className="text-muted-foreground"> — {q.client}</span>
                        </span>
                        <Badge variant="secondary" className="shrink-0">{remaining} unit{remaining === 1 ? '' : 's'} left</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Crew (optional)</Label>
            <FitterPicker
              employees={employees} selected={crew} onToggle={toggleCrew}
              amounts={holidayAmounts} disabledIds={holidayIds}
            />
            {holidayIds.size > 0 && (
              <p className="text-xs text-destructive">
                {employees.filter(e => holidayIds.has(e.id)).map(e => e.name).join(', ')} —
                on holiday this day, cannot be booked.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Input value={note} onChange={e => setNote(e.target.value)}
              placeholder="e.g. Scaffold arrives 8am, start at rear" />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={save} disabled={!quote}>Book job</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────── Log work dialog ─────────── */
interface UnitKeyed extends UnitOption { key: string }

function LogWorkDialog({
  date, quotes, employees, assignedUnits, sameDay, holidayIds, onClose, onSave,
}: {
  date: string;
  quotes: Project[];
  employees: Employee[];
  assignedUnits: Set<string>;
  sameDay: LabourAssignment[];
  holidayIds: Set<string>;
  onClose: () => void;
  onSave: (assignments: LabourAssignment[]) => void;
}) {
  const [mode, setMode] = useState<'install' | 'extra'>('install');
  // How the crew is paid for this install: by the item allocation, or a day rate
  const [payMode, setPayMode] = useState<'items' | 'day'>('items');
  const [dayFraction, setDayFraction] = useState<1 | 0.5>(1);

  const [search, setSearch] = useState('');
  const [quoteId, setQuoteId] = useState('');
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [fitters, setFitters] = useState<Set<string>>(new Set());
  const [splitEqually, setSplitEqually] = useState(true);

  const [extraDesc, setExtraDesc] = useState('');
  const [extraAmount, setExtraAmount] = useState('');
  const [linkQuote, setLinkQuote] = useState(false);

  // Same-day rules: a fitter already on day rate today can't be paid twice,
  // and a fitter already paid per item can't switch to a day rate.
  const onDayRate = useMemo(
    () => new Set(sameDay.filter(a => a.kind === 'day').map(a => a.employeeId)),
    [sameDay]);
  const paidItemsToday = useMemo(
    () => new Set(sameDay.filter(a => a.kind === 'item' && a.labourAmount > 0).map(a => a.employeeId)),
    [sameDay]);

  const quote = quotes.find(q => q.id === quoteId);
  const dayPay = mode === 'install' && payMode === 'day';

  const filteredQuotes = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return quotes;
    return quotes.filter(q =>
      q.projectRef.toLowerCase().includes(s) || (q.client || '').toLowerCase().includes(s));
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

  // A fitter on holiday can never be credited, whichever tab selected them.
  const fitterIds = [...fitters].filter(id => !holidayIds.has(id));
  const nFitters = fitterIds.length;

  // Who is ineligible, and why — drives the greyed-out chips and their labels.
  const disabledReason = (e: Employee): string | null => {
    if (holidayIds.has(e.id)) return 'on holiday';
    if (dayPay) {
      if (onDayRate.has(e.id)) return 'already on day rate';
      if (paidItemsToday.has(e.id)) return 'paid items today';
      if (!e.dayRate) return 'no day rate';
    }
    return null;
  };
  const disabledIds = new Set(employees.filter(e => disabledReason(e) !== null).map(e => e.id));

  const chipLabels: Record<string, string> = {};
  employees.forEach(e => {
    const reason = disabledReason(e);
    if (reason) chipLabels[e.id] = reason;
    else if (dayPay) chipLabels[e.id] = gbp(e.dayRate * dayFraction);
    else if (mode === 'install' && onDayRate.has(e.id)) chipLabels[e.id] = 'day rate — £0';
  });

  const eligibleIds = fitterIds.filter(id => !disabledIds.has(id));
  const eligibleEmps = employees.filter(e => eligibleIds.includes(e.id));

  // Item-allocation payouts skip fitters already on a day rate today.
  const payingIds = eligibleIds.filter(id => !onDayRate.has(id));
  const nPaying = payingIds.length;

  const chosenUnits = availableUnits.filter(u => selectedUnits.has(u.key));
  const itemsTotal = chosenUnits.reduce((s, u) => s + u.labour, 0);
  const extraAmountNum = Math.round((parseFloat(extraAmount) || 0) * 100) / 100;
  const dayTotal = eligibleEmps.reduce((s, e) => s + Math.round(e.dayRate * dayFraction * 100) / 100, 0);

  const payoutTotal =
    mode === 'extra'
      ? (splitEqually ? extraAmountNum : extraAmountNum * Math.max(1, nFitters))
      : dayPay
      ? dayTotal
      : (splitEqually ? (nPaying > 0 ? itemsTotal : 0) : itemsTotal * nPaying);

  const canSave =
    eligibleIds.length > 0 &&
    (mode === 'extra'
      ? extraDesc.trim().length > 0 && extraAmountNum > 0
      : dayPay
      ? dayTotal > 0                                 // windows optional on a day-rate day
      : !!quote && chosenUnits.length > 0);

  const save = () => {
    const now = new Date().toISOString();
    const records: LabourAssignment[] = [];

    if (mode === 'install') {
      // Windows installed: on a day rate they carry no cost (£0), logged only
      // so the units are marked installed and attributed to whoever fitted them.
      if (quote) {
        for (const u of chosenUnits) {
          const payingShares = !dayPay && splitEqually && nPaying > 0 ? splitAmount(u.labour, nPaying) : [];
          let payIdx = 0;
          const shares = eligibleIds.map(id => {
            if (dayPay || onDayRate.has(id)) return 0;
            if (!splitEqually) return u.labour;
            return nPaying > 0 ? payingShares[payIdx++] : 0;
          });
          eligibleIds.forEach((empId, i) => {
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
      }
      // The day rate itself: one paid record per fitter.
      if (dayPay) {
        const label = dayFraction === 1 ? 'Day work' : 'Half-day work';
        eligibleEmps.forEach(e => {
          records.push({
            id: crypto.randomUUID(),
            workDate: date,
            kind: 'day',
            quoteId: quote?.id ?? null,
            quoteRef: quote?.projectRef ?? '',
            clientName: quote?.client ?? '',
            lineItemId: null,
            unitIndex: null,
            itemDesc: label,
            employeeId: e.id,
            labourAmount: Math.round(e.dayRate * dayFraction * 100) / 100,
            createdAt: now,
          });
        });
      }
    } else {
      const shares = splitEqually
        ? splitAmount(extraAmountNum, eligibleIds.length)
        : eligibleIds.map(() => extraAmountNum);
      const linked = linkQuote ? quote : undefined;
      eligibleIds.forEach((empId, i) => {
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
      <Label>{mode === 'install' ? (dayPay ? 'Job (optional)' : 'Won quote') : 'Link to quote (optional)'}</Label>
      {quote ? (
        <div className="flex items-center justify-between border rounded-md px-3 py-2 text-sm bg-primary/5 border-primary">
          <span className="min-w-0 truncate font-medium">{quote.projectRef} — {quote.client}</span>
          <Button variant="ghost" size="sm" className="gap-1 shrink-0 h-7"
            onClick={() => { setQuoteId(''); setSelectedUnits(new Set()); setSearch(''); }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Change
          </Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by quote ref or client…" className="pl-8" />
          </div>
          <ul className="border rounded-md divide-y max-h-40 overflow-y-auto">
            {filteredQuotes.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                {quotes.length === 0 ? 'No won quotes yet.' : 'No quotes match your search.'}
              </li>
            )}
            {filteredQuotes.map(q => (
              <li key={q.id}>
                <button type="button" onClick={() => { setQuoteId(q.id); setSelectedUnits(new Set()); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors">
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

  const awayNames = employees.filter(e => holidayIds.has(e.id)).map(e => e.name);

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">
            Log work — {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={v => setMode(v as 'install' | 'extra')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="install">Windows &amp; doors</TabsTrigger>
            <TabsTrigger value="extra" className="gap-1.5"><Wrench className="w-3.5 h-3.5" /> Extra work</TabsTrigger>
          </TabsList>

          {/* ── INSTALL: windows selected here, paid by item OR by day rate ── */}
          <TabsContent value="install" className="space-y-4 mt-4">
            {quotePicker}

            {quote && (
              <div className="space-y-1.5">
                <Label>Items installed ({availableUnits.length} remaining on this quote)</Label>
                {availableUnits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Every unit on this quote has already been logged as installed.
                  </p>
                ) : (
                  <ul className="space-y-1 max-h-44 overflow-y-auto pr-1">
                    {availableUnits.map(u => {
                      const isOn = selectedUnits.has(u.key);
                      return (
                        <li key={u.key}>
                          <button type="button" onClick={() => toggleUnit(u.key)}
                            className={`w-full flex items-center justify-between gap-2 border rounded-md px-3 py-2 text-sm text-left transition-colors ${
                              isOn ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                            }`}>
                            <span className="min-w-0 truncate">{u.label}</span>
                            {dayPay ? (
                              <span className="shrink-0 flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground line-through">{gbp(u.labour)}</span>
                                <span className="font-medium">£0.00</span>
                              </span>
                            ) : (
                              <span className="font-medium shrink-0">{gbp(u.labour)}</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {/* how the crew is paid for this install */}
            <div className="space-y-1.5">
              <Label>How is the crew paid?</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setPayMode('items')}
                  className={`border rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    payMode === 'items' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'
                  }`}>
                  Item allocation
                </button>
                <button type="button" onClick={() => setPayMode('day')}
                  className={`border rounded-md px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    payMode === 'day' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'
                  }`}>
                  <Sun className="w-3.5 h-3.5" /> Day work
                </button>
              </div>

              {dayPay && (
                <div className="space-y-1.5 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    {([[1, 'Full day'], [0.5, 'Half day']] as const).map(([frac, label]) => (
                      <button key={label} type="button" onClick={() => setDayFraction(frac)}
                        className={`border rounded-md px-3 py-1.5 text-sm transition-colors ${
                          dayFraction === frac ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The windows carry no cost — each fitter is paid their fixed day rate
                    (shown on their name below) instead of the item allocation.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── EXTRA ── */}
          <TabsContent value="extra" className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>Description of the work</Label>
              <Input value={extraDesc} onChange={e => setExtraDesc(e.target.value)}
                placeholder="e.g. Rebuild rotten sub-frame, extra making good…" />
            </div>
            <div className="space-y-1.5">
              <Label>Labour amount (£)</Label>
              <Input value={extraAmount} onChange={e => setExtraAmount(e.target.value)}
                placeholder="0.00" inputMode="decimal" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={linkQuote} id="link-quote"
                onCheckedChange={v => { setLinkQuote(v); if (!v) { setQuoteId(''); setSearch(''); } }} />
              <Label htmlFor="link-quote" className="cursor-pointer">Link this work to a quote</Label>
            </div>
            {linkQuote && quotePicker}
          </TabsContent>
        </Tabs>

        {/* ── FITTERS (shared) ── */}
        <div className="space-y-2 pt-1">
          <Label>Fitted by {nFitters > 1 ? `(${nFitters} fitters)` : ''}</Label>
          <FitterPicker
            employees={employees}
            selected={fitters}
            onToggle={toggleFitter}
            amounts={chipLabels}
            disabledIds={disabledIds}
          />
          {awayNames.length > 0 && (
            <p className="text-xs text-rose-600">
              {awayNames.join(', ')} {awayNames.length === 1 ? 'is' : 'are'} on holiday this day and can't be assigned work.
            </p>
          )}
          {dayPay && disabledIds.size > awayNames.length && (
            <p className="text-xs text-muted-foreground">
              Greyed-out fitters have no day rate, are already on day rate today, or were already paid for items today.
            </p>
          )}
          {mode === 'install' && !dayPay && eligibleIds.some(id => onDayRate.has(id)) && (
            <p className="text-xs text-muted-foreground">
              Fitters marked "day rate" are already paid for this day — the windows are logged
              to them at £0{nPaying > 0 ? '; the allocation goes to the other fitters' : ''}.
            </p>
          )}
          {!dayPay && nFitters > 1 && (
            <div className="flex items-center justify-between border rounded-md px-3 py-2">
              <div className="flex items-center gap-2">
                <Switch checked={splitEqually} onCheckedChange={setSplitEqually} id="split-eq" />
                <Label htmlFor="split-eq" className="cursor-pointer text-sm">
                  {splitEqually ? 'Split allocation equally' : 'Full amount to each fitter'}
                </Label>
              </div>
              <span className="text-xs text-muted-foreground">
                {splitEqually
                  ? `≈ ${gbp((mode === 'install' ? itemsTotal : extraAmountNum) / Math.max(1, nPaying || nFitters))} each`
                  : 'full each'}
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
