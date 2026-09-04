'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Pole } from '@/types/pole';
import { Provider } from '@/types/provider';
import { DEFAULT_PROVIDERS, resolveProviderInfo } from '@/config/providers';
import { useSupabaseRealtimePoles } from '@/hooks/useSupabaseRealtimePoles';
import { PoleMiniGraphic } from '@/components/survey/PoleVisualGuideModal';
import {
  Building2,
  Database,
  Search,
  ExternalLink,
  ChevronRight,
  Palette,
  Image as ImageIcon,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Flame,
  BarChart3,
  PieChart,
  Filter,
  PlusCircle,
  Map as MapIcon,
  Layers,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Users,
  UserCheck,
  CalendarDays,
  Clock3,
} from 'lucide-react';

interface ProvidersSummaryClientProps {
  initialPoles: Pole[];
  providers?: Provider[];
}

type InputTeam = 'KOMINFO' | 'BAPENDA' | 'LAINNYA';

interface SurveyorMeta {
  id: string;
  displayName: string;
  team: InputTeam;
  teamLabel: string;
  roleLabel: string;
}

const KNOWN_SURVEYORS: SurveyorMeta[] = [
  {
    id: 'USR-KOMINFO-ADMIN',
    displayName: 'Admin DISKOMINFOTIKSAN',
    team: 'KOMINFO',
    teamLabel: 'Tim Kominfo',
    roleLabel: 'Admin Kominfo',
  },
  {
    id: 'USR-SURVEYOR-01',
    displayName: 'M. Tri Saputra',
    team: 'KOMINFO',
    teamLabel: 'Tim Kominfo',
    roleLabel: 'User Kominfo',
  },
  {
    id: 'USR-SURVEYOR-02',
    displayName: 'Yodi Heropralaga',
    team: 'BAPENDA',
    teamLabel: 'Tim Bapenda',
    roleLabel: 'Surveyor Bapenda',
  },
  {
    id: 'USR-SURVEYOR-03',
    displayName: 'Andika Yulian Putra',
    team: 'BAPENDA',
    teamLabel: 'Tim Bapenda',
    roleLabel: 'Surveyor Bapenda',
  },
  {
    id: 'USR-SURVEYOR-04',
    displayName: 'Pradigga Navigasi',
    team: 'BAPENDA',
    teamLabel: 'Tim Bapenda',
    roleLabel: 'Surveyor Bapenda',
  },
  {
    id: 'USR-SURVEYOR-05',
    displayName: 'Frans Ahmad Zhafif',
    team: 'KOMINFO',
    teamLabel: 'Tim Kominfo',
    roleLabel: 'User Kominfo',
  },
  {
    id: 'USR-SURVEYOR-06',
    displayName: 'M. Fadlil',
    team: 'KOMINFO',
    teamLabel: 'Tim Kominfo',
    roleLabel: 'User Kominfo',
  },
  {
    id: 'USR-SURVEYOR-07',
    displayName: 'M. Rifqi',
    team: 'KOMINFO',
    teamLabel: 'Tim Kominfo',
    roleLabel: 'User Kominfo',
  },
];

function getJakartaDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function getPoleInputDate(pole: Pole) {
  return (pole.surveyDate || pole.createdAt || '').slice(0, 10) || 'TANPA_TANGGAL';
}

function resolveSurveyorMeta(pole: Pole): SurveyorMeta {
  const rawId = (pole.surveyorId || '').trim();
  const rawName = (pole.surveyorName || '').trim();
  const lookup = `${rawId} ${rawName}`.toLowerCase();

  const known =
    KNOWN_SURVEYORS.find((user) => user.id === rawId) ||
    KNOWN_SURVEYORS.find((user) => lookup.includes(user.displayName.toLowerCase().split(' ')[0]) && lookup.includes(user.displayName.toLowerCase().split(' ').slice(-1)[0])) ||
    (lookup.includes('tri') ? KNOWN_SURVEYORS.find((user) => user.id === 'USR-SURVEYOR-01') : undefined) ||
    (lookup.includes('frans') ? KNOWN_SURVEYORS.find((user) => user.id === 'USR-SURVEYOR-05') : undefined) ||
    (lookup.includes('fadlil') ? KNOWN_SURVEYORS.find((user) => user.id === 'USR-SURVEYOR-06') : undefined) ||
    (lookup.includes('rifqi') ? KNOWN_SURVEYORS.find((user) => user.id === 'USR-SURVEYOR-07') : undefined) ||
    (lookup.includes('yodi') ? KNOWN_SURVEYORS.find((user) => user.id === 'USR-SURVEYOR-02') : undefined) ||
    (lookup.includes('andika') ? KNOWN_SURVEYORS.find((user) => user.id === 'USR-SURVEYOR-03') : undefined) ||
    (lookup.includes('pradigga') || lookup.includes('pradiga') ? KNOWN_SURVEYORS.find((user) => user.id === 'USR-SURVEYOR-04') : undefined) ||
    (lookup.includes('admin') || lookup.includes('kominfo') ? KNOWN_SURVEYORS.find((user) => user.id === 'USR-KOMINFO-ADMIN') : undefined);

  if (known) return known;

  return {
    id: rawId || rawName || 'UNKNOWN_SURVEYOR',
    displayName: rawName || rawId || 'Tidak diketahui',
    team: 'LAINNYA',
    teamLabel: 'Tim Lainnya',
    roleLabel: 'User tidak terklasifikasi',
  };
}

function formatPercent(count: number, total: number) {
  if (!total) return '0.0';
  return ((count / total) * 100).toFixed(1);
}

export default function ProvidersSummaryClient({
  initialPoles,
  providers = [],
}: ProvidersSummaryClientProps) {
  const { poles: livePoles, isLoading } = useSupabaseRealtimePoles(initialPoles);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'ACTIVE_ONLY' | 'GOV_PLN' | 'ISP_FO'>('ALL');
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'INPUT_USERS' | 'VISUAL_GUIDE'>('SUMMARY');
  const [selectedInputDate, setSelectedInputDate] = useState('');
  const [dailyPage, setDailyPage] = useState(1);
  const [userTeamFilter, setUserTeamFilter] = useState<'ALL' | 'KOMINFO' | 'BAPENDA'>('ALL');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // 1. Merge default providers with any custom provider records
  const allProvidersList = useMemo(() => {
    const map = new Map<string, Provider>();
    DEFAULT_PROVIDERS.forEach((p) => map.set(p.id, p));
    providers.forEach((p) => map.set(p.id, { ...map.get(p.id), ...p }));
    return Array.from(map.values());
  }, [providers]);

  // 2. Compute comprehensive per-provider statistics
  const providerStats = useMemo(() => {
    const totalPolesCount = livePoles.length;

    // Initialize stats map with all known providers
    const statsMap: Record<
      string,
      {
        provider: Provider;
        count: number;
        percentage: number;
        goodCount: number;
        repairCount: number;
        damagedCount: number;
        hazardCount: number;
        tiltedCount: number;
        messyCount: number;
        undergroundCount: number;
        topKecamatan: string;
        kecamatanDistribution: Record<string, number>;
      }
    > = {};

    allProvidersList.forEach((prov) => {
      statsMap[prov.id] = {
        provider: prov,
        count: 0,
        percentage: 0,
        goodCount: 0,
        repairCount: 0,
        damagedCount: 0,
        hazardCount: 0,
        tiltedCount: 0,
        messyCount: 0,
        undergroundCount: 0,
        topKecamatan: '-',
        kecamatanDistribution: {},
      };
    });

    // Populate with actual pole data
    livePoles.forEach((pole) => {
      const resolved = resolveProviderInfo({
        providerId: pole.providerId,
        providerName: pole.providerName,
        infrastructureCategory: pole.infrastructureCategory,
      });

      let targetId = resolved.providerId;
      if (!statsMap[targetId]) {
        // Fallback for custom or unknown provider
        const customProv: Provider = {
          id: targetId,
          code: resolved.providerId.replace('PRV_', '').substring(0, 5).toUpperCase(),
          name: resolved.providerName,
          colorHex: resolved.selectedProviderObj?.colorHex || '#64748b',
          status: 'ACTIVE',
          markingDescription: 'Provider Khusus / Tambahan',
        };
        statsMap[targetId] = {
          provider: customProv,
          count: 0,
          percentage: 0,
          goodCount: 0,
          repairCount: 0,
          damagedCount: 0,
          hazardCount: 0,
          tiltedCount: 0,
          messyCount: 0,
          undergroundCount: 0,
          topKecamatan: '-',
          kecamatanDistribution: {},
        };
      }

      const st = statsMap[targetId];
      st.count += 1;

      if (pole.condition === 'GOOD') st.goodCount += 1;
      else if (pole.condition === 'NEEDS_REPAIR') st.repairCount += 1;
      else if (pole.condition === 'DAMAGED') st.damagedCount += 1;

      if (pole.isTilted) st.tiltedCount += 1;
      if (pole.isMessyCable) st.messyCount += 1;
      if (
        pole.isTilted ||
        pole.isMessyCable ||
        pole.isLowCable ||
        pole.isCorroded ||
        pole.isObstructing ||
        pole.isHazardous
      ) {
        st.hazardCount += 1;
      }

      if (
        pole.cableInstallationType === 'BAWAH_TANAH' ||
        pole.cableInstallationType === 'TRANSISI_RISER'
      ) {
        st.undergroundCount += 1;
      }

      if (pole.kecamatan) {
        const kec = pole.kecamatan.replace(/^Kecamatan\s+/i, '');
        st.kecamatanDistribution[kec] = (st.kecamatanDistribution[kec] || 0) + 1;
      }
    });

    // Compute percentages & top kecamatan
    const statsList = Object.values(statsMap).map((st) => {
      st.percentage = totalPolesCount > 0 ? (st.count / totalPolesCount) * 100 : 0;

      // Find top kecamatan
      let maxKec = '-';
      let maxKecCount = 0;
      Object.entries(st.kecamatanDistribution).forEach(([kec, cnt]) => {
        if (cnt > maxKecCount) {
          maxKecCount = cnt;
          maxKec = kec;
        }
      });
      st.topKecamatan = maxKec;

      return st;
    });

    // Sort by count descending, then by provider code
    return statsList.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.provider.name.localeCompare(b.provider.name);
    });
  }, [livePoles, allProvidersList]);

  // Filtered list
  const filteredStats = useMemo(() => {
    return providerStats.filter((st) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        st.provider.name.toLowerCase().includes(q) ||
        st.provider.code.toLowerCase().includes(q) ||
        (st.provider.markingDescription || '').toLowerCase().includes(q);

      if (!matchQuery) return false;

      if (filterType === 'ACTIVE_ONLY' && st.count === 0) return false;
      if (filterType === 'GOV_PLN') {
        const isGovOrPln =
          st.provider.id === 'PRV_PLN_DISTRIBUSI' ||
          st.provider.id === 'PRV_PLN_PJU_GABUNG' ||
          st.provider.id === 'PRV_PJU_PEMKOT';
        if (!isGovOrPln) return false;
      }
      if (filterType === 'ISP_FO') {
        const isGovOrPln =
          st.provider.id === 'PRV_PLN_DISTRIBUSI' ||
          st.provider.id === 'PRV_PLN_PJU_GABUNG' ||
          st.provider.id === 'PRV_PJU_PEMKOT';
        if (isGovOrPln) return false;
      }

      return true;
    });
  }, [providerStats, searchQuery, filterType]);

  // Overall Global Counts
  const activeProvidersCount = useMemo(
    () => providerStats.filter((s) => s.count > 0).length,
    [providerStats]
  );
  const totalPolesCount = livePoles.length;

  const plnCount = useMemo(
    () =>
      (providerStats.find((s) => s.provider.id === 'PRV_PLN_DISTRIBUSI')?.count || 0) +
      (providerStats.find((s) => s.provider.id === 'PRV_PLN_PJU_GABUNG')?.count || 0),
    [providerStats]
  );

  const pjuCount = useMemo(
    () => providerStats.find((s) => s.provider.id === 'PRV_PJU_PEMKOT')?.count || 0,
    [providerStats]
  );

  const ispCount = useMemo(
    () => Math.max(0, totalPolesCount - plnCount - pjuCount),
    [totalPolesCount, plnCount, pjuCount]
  );

  const todayJakarta = useMemo(() => getJakartaDateString(), []);

  const inputStats = useMemo(() => {
    const userMap = new Map<
      string,
      SurveyorMeta & {
        total: number;
        today: number;
        goodCount: number;
        repairCount: number;
        damagedCount: number;
        latestDate: string;
      }
    >();

    KNOWN_SURVEYORS.forEach((user) => {
      userMap.set(user.id, {
        ...user,
        total: 0,
        today: 0,
        goodCount: 0,
        repairCount: 0,
        damagedCount: 0,
        latestDate: '-',
      });
    });

    const teamMap: Record<
      InputTeam,
      {
        team: InputTeam;
        label: string;
        total: number;
        today: number;
        users: number;
      }
    > = {
      KOMINFO: { team: 'KOMINFO', label: 'Tim Kominfo', total: 0, today: 0, users: 0 },
      BAPENDA: { team: 'BAPENDA', label: 'Tim Bapenda', total: 0, today: 0, users: 0 },
      LAINNYA: { team: 'LAINNYA', label: 'Tim Lainnya', total: 0, today: 0, users: 0 },
    };

    const dailyMap = new Map<
      string,
      {
        date: string;
        total: number;
        kominfo: number;
        bapenda: number;
        lainnya: number;
      }
    >();

    livePoles.forEach((pole) => {
      const meta = resolveSurveyorMeta(pole);
      const date = getPoleInputDate(pole);
      const key = meta.id;

      if (!userMap.has(key)) {
        userMap.set(key, {
          ...meta,
          total: 0,
          today: 0,
          goodCount: 0,
          repairCount: 0,
          damagedCount: 0,
          latestDate: '-',
        });
      }

      const user = userMap.get(key)!;
      user.total += 1;
      if (date === todayJakarta) user.today += 1;
      if (pole.condition === 'GOOD') user.goodCount += 1;
      else if (pole.condition === 'NEEDS_REPAIR') user.repairCount += 1;
      else if (pole.condition === 'DAMAGED') user.damagedCount += 1;
      if (date !== 'TANPA_TANGGAL' && (user.latestDate === '-' || date > user.latestDate)) {
        user.latestDate = date;
      }

      const team = teamMap[meta.team];
      team.total += 1;
      if (date === todayJakarta) team.today += 1;

      const daily = dailyMap.get(date) || {
        date,
        total: 0,
        kominfo: 0,
        bapenda: 0,
        lainnya: 0,
      };
      daily.total += 1;
      if (meta.team === 'KOMINFO') daily.kominfo += 1;
      else if (meta.team === 'BAPENDA') daily.bapenda += 1;
      else daily.lainnya += 1;
      dailyMap.set(date, daily);
    });

    const users = Array.from(userMap.values()).sort((a, b) => {
      const teamOrder = { KOMINFO: 0, BAPENDA: 1, LAINNYA: 2 };
      if (teamOrder[a.team] !== teamOrder[b.team]) return teamOrder[a.team] - teamOrder[b.team];
      if (b.total !== a.total) return b.total - a.total;
      return a.displayName.localeCompare(b.displayName);
    });

    users.forEach((user) => {
      teamMap[user.team].users += 1;
    });

    return {
      users,
      teams: [teamMap.KOMINFO, teamMap.BAPENDA, teamMap.LAINNYA].filter(
        (team) => team.team !== 'LAINNYA' || team.total > 0
      ),
      daily: Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date)),
      todayTotal: livePoles.filter((pole) => getPoleInputDate(pole) === todayJakarta).length,
    };
  }, [livePoles, todayJakarta]);

  useEffect(() => {
    if (inputStats.daily.length === 0) {
      setSelectedInputDate('');
      return;
    }

    const selectedStillExists = inputStats.daily.some((day) => day.date === selectedInputDate);
    if (selectedStillExists) return;

    const todayRecord = inputStats.daily.find((day) => day.date === todayJakarta);
    setSelectedInputDate(todayRecord?.date || inputStats.daily[0].date);
  }, [inputStats.daily, selectedInputDate, todayJakarta]);

  const selectedDayStats = useMemo(() => {
    return (
      inputStats.daily.find((day) => day.date === selectedInputDate) || {
        date: selectedInputDate || todayJakarta,
        total: 0,
        kominfo: 0,
        bapenda: 0,
        lainnya: 0,
      }
    );
  }, [inputStats.daily, selectedInputDate, todayJakarta]);

  const selectedUserStats = useMemo(() => {
    const userMap = new Map<
      string,
      SurveyorMeta & {
        selectedTotal: number;
        allTotal: number;
        goodCount: number;
        repairCount: number;
        damagedCount: number;
      }
    >();

    inputStats.users.forEach((user) => {
      userMap.set(user.id, {
        id: user.id,
        displayName: user.displayName,
        team: user.team,
        teamLabel: user.teamLabel,
        roleLabel: user.roleLabel,
        selectedTotal: 0,
        allTotal: user.total,
        goodCount: 0,
        repairCount: 0,
        damagedCount: 0,
      });
    });

    livePoles.forEach((pole) => {
      if (getPoleInputDate(pole) !== selectedDayStats.date) return;

      const meta = resolveSurveyorMeta(pole);
      if (!userMap.has(meta.id)) {
        userMap.set(meta.id, {
          ...meta,
          selectedTotal: 0,
          allTotal: 0,
          goodCount: 0,
          repairCount: 0,
          damagedCount: 0,
        });
      }

      const user = userMap.get(meta.id)!;
      user.selectedTotal += 1;
      if (pole.condition === 'GOOD') user.goodCount += 1;
      else if (pole.condition === 'NEEDS_REPAIR') user.repairCount += 1;
      else if (pole.condition === 'DAMAGED') user.damagedCount += 1;
    });

    return Array.from(userMap.values()).sort((a, b) => {
      const teamOrder = { KOMINFO: 0, BAPENDA: 1, LAINNYA: 2 };
      if (teamOrder[a.team] !== teamOrder[b.team]) return teamOrder[a.team] - teamOrder[b.team];
      if (b.selectedTotal !== a.selectedTotal) return b.selectedTotal - a.selectedTotal;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [inputStats.users, livePoles, selectedDayStats.date]);

  const filteredUsers = useMemo(() => {
    return selectedUserStats.filter((u) => {
      const matchTeam = userTeamFilter === 'ALL' || u.team === userTeamFilter;
      const matchSearch =
        !userSearchQuery.trim() ||
        u.displayName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.id.toLowerCase().includes(userSearchQuery.toLowerCase());
      return matchTeam && matchSearch;
    });
  }, [selectedUserStats, userTeamFilter, userSearchQuery]);

  const kominfoSurveyorCount = useMemo(
    () => selectedUserStats.filter((u) => u.team === 'KOMINFO').length,
    [selectedUserStats]
  );
  const bapendaSurveyorCount = useMemo(
    () => selectedUserStats.filter((u) => u.team === 'BAPENDA').length,
    [selectedUserStats]
  );

  const dailyPageSize = 5;
  const dailyTotalPages = Math.max(1, Math.ceil(inputStats.daily.length / dailyPageSize));
  const paginatedDaily = inputStats.daily.slice((dailyPage - 1) * dailyPageSize, dailyPage * dailyPageSize);

  useEffect(() => {
    if (dailyPage > dailyTotalPages) {
      setDailyPage(dailyTotalPages);
    }
  }, [dailyPage, dailyTotalPages]);

  return (
    <div className="font-sans text-slate-800 pb-24 animate-in fade-in">
      <div className="relative overflow-hidden bg-slate-950 text-white pt-5 pb-7 px-4 sm:px-6 rounded-b-[34px] shadow-2xl shadow-slate-950/35 border-b border-slate-800/80">
        <div className="relative z-10 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-[10px] font-mono text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>DISKOMINFOTIKSAN</span>
                <span className="text-slate-500">•</span>
                <span>Provider &amp; User Input</span>
              </div>
              <h1 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                Ringkasan Infrastruktur Kota
              </h1>
              <p className="mt-1.5 text-xs text-slate-300 leading-relaxed max-w-md">
                Rekap provider, kondisi aset, dan produktivitas input tim lapangan berdasarkan data live.
              </p>
            </div>

            <Link
              href="/poles/new"
              className="w-12 h-12 sm:w-auto sm:h-auto sm:py-2.5 sm:px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-black text-xs rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all border border-blue-400/30 flex-shrink-0"
              aria-label="Survei Baru"
            >
              <PlusCircle className="w-5 h-5" />
              <span className="hidden sm:inline">Survei Baru</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/95 text-slate-900 rounded-3xl p-4 border border-white/70 shadow-[0_4px_20px_rgba(15,23,42,0.08)] min-h-[120px]">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 leading-snug">Total Aset Tiang</span>
                <Database className="w-4 h-4 text-blue-600 flex-shrink-0" />
              </div>
              <p className="mt-3 text-3xl font-black font-mono tracking-tight leading-none">{totalPolesCount}</p>
              <span className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-500 block">
                {activeProvidersCount} instansi aktif
              </span>
            </div>

            <div className="bg-white/95 text-slate-900 rounded-3xl p-4 border border-white/70 shadow-[0_4px_20px_rgba(15,23,42,0.08)] min-h-[120px]">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 leading-snug">Jaringan PLN</span>
                <Layers className="w-4 h-4 text-sky-600 flex-shrink-0" />
              </div>
              <p className="mt-3 text-3xl font-black font-mono tracking-tight leading-none">{plnCount}</p>
              <span className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-sky-700 font-bold block">
                {formatPercent(plnCount, totalPolesCount)}% dari total
              </span>
            </div>

            <div className="bg-white/95 text-slate-900 rounded-3xl p-4 border border-white/70 shadow-[0_4px_20px_rgba(15,23,42,0.08)] min-h-[120px]">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 leading-snug">PJU Pemkot</span>
                <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
              </div>
              <p className="mt-3 text-3xl font-black font-mono tracking-tight leading-none">{pjuCount}</p>
              <span className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-amber-700 font-bold block">
                {formatPercent(pjuCount, totalPolesCount)}% lampu jalan
              </span>
            </div>

            <div className="bg-white/95 text-slate-900 rounded-3xl p-4 border border-white/70 shadow-[0_4px_20px_rgba(15,23,42,0.08)] min-h-[120px]">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 leading-snug">Provider ISP / FO</span>
                <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              </div>
              <p className="mt-3 text-3xl font-black font-mono tracking-tight leading-none">{ispCount}</p>
              <span className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-indigo-700 font-bold block">
                {formatPercent(ispCount, totalPolesCount)}% operator
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 sm:px-6 -mt-2 relative z-20">

      {/* 3. Navigation View Switcher */}
      <div className="bg-white/95 border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.05)] p-1 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar text-[11px] font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('SUMMARY')}
          className={`min-w-[112px] py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'SUMMARY'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span className="leading-tight">Statistik Tiang ({activeProvidersCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('INPUT_USERS')}
          className={`min-w-[112px] py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'INPUT_USERS'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="leading-tight">Input User ({inputStats.users.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('VISUAL_GUIDE')}
          className={`min-w-[112px] py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'VISUAL_GUIDE'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span className="leading-tight">Marka Warna ({allProvidersList.length})</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* VIEW 1: FULL SUMMARY & DATA STATS PER PROVIDER              */}
      {/* ============================================================ */}
      {activeTab === 'SUMMARY' && (
        <div className="space-y-3.5">
          {/* Search & Filter Chips */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari provider, kode, atau keterangan..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 shadow-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  filterType === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Semua ({providerStats.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('ACTIVE_ONLY')}
                className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  filterType === 'ACTIVE_ONLY'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Ada Data ({activeProvidersCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('GOV_PLN')}
                className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  filterType === 'GOV_PLN'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                ⚡💡 PLN &amp; Pemkot
              </button>
              <button
                type="button"
                onClick={() => setFilterType('ISP_FO')}
                className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  filterType === 'ISP_FO'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                🌐 Provider ISP / FO
              </button>
            </div>
          </div>

          {/* List of Provider Breakdown Cards */}
          <div className="space-y-3">
            {filteredStats.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center space-y-2">
                <span className="text-3xl block">🔍</span>
                <h3 className="text-sm font-black text-slate-800">
                  Tidak Ada Provider yang Sesuai
                </h3>
                <p className="text-xs text-slate-500">
                  Coba sesuaikan kata kunci pencarian atau filter tipe instansi.
                </p>
              </div>
            ) : (
              filteredStats.map((st, index) => {
                const prov = st.provider;
                const isTopRanking = index < 3 && st.count > 0;

                return (
                  <div
                    key={prov.id}
                    className={`bg-white rounded-3xl p-4 border transition-all space-y-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)] ${
                      st.count > 0
                        ? 'border-slate-200/90 hover:border-blue-300'
                        : 'border-slate-100 opacity-65 hover:opacity-100'
                    }`}
                  >
                    {/* Top Row: Provider Identity & Total Count Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Mini Pole Preview Graphic */}
                        <div className="w-10 h-14 p-1 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-center flex-shrink-0">
                          <PoleMiniGraphic provider={prov} height={46} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <span
                              className="px-2 py-0.5 rounded-md text-[9px] font-black text-white font-mono shadow-2xs"
                              style={{ backgroundColor: prov.colorHex || '#3b82f6' }}
                            >
                              {prov.code}
                            </span>

                            {isTopRanking && (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 text-[9px] font-black rounded-md flex items-center gap-0.5">
                                <span>🏆</span>
                                <span>Peringkat #{index + 1}</span>
                              </span>
                            )}

                            {st.count === 0 && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded-md">
                                Belum Ada Data
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-black text-slate-900 truncate">
                            {prov.name}
                          </h3>
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {prov.markingDescription || 'Identitas fisik resmi'}
                          </p>
                        </div>
                      </div>

                      {/* Count Display */}
                      <div className="text-right flex-shrink-0 min-w-[72px]">
                        <div className="flex items-baseline justify-end gap-1">
                          <span className="text-xl font-black text-slate-900 font-mono">
                            {st.count}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">Tiang</span>
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 font-mono">
                          {st.percentage.toFixed(1)}% Pangsa
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar of Market Share */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(st.count > 0 ? 3 : 0, st.percentage)}%`,
                          backgroundColor: prov.colorHex || '#3b82f6',
                        }}
                      />
                    </div>

                    {/* Quality & Spatial Metrics Grid */}
                    {st.count > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] pt-1">
                        {/* Kondisi Fisik */}
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-0.5">
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">
                            Kondisi Fisik
                          </span>
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="text-emerald-700">🟢 {st.goodCount}</span>
                            <span className="text-amber-700">🟡 {st.repairCount}</span>
                            <span className="text-rose-700">🔴 {st.damagedCount}</span>
                          </div>
                        </div>

                        {/* Potensi Bahaya / Miring */}
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-0.5">
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">
                            Masalah Lapangan
                          </span>
                          <span className="font-bold text-slate-800 block">
                            {st.hazardCount > 0 ? (
                              <span className="text-amber-700">⚠️ {st.hazardCount} Tiang Masalah</span>
                            ) : (
                              <span className="text-emerald-700">✅ 100% Aman</span>
                            )}
                          </span>
                        </div>

                        {/* Wilayah Dominan */}
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-0.5">
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">
                            Kec. Terbanyak
                          </span>
                          <span className="font-bold text-slate-800 truncate block">
                            📍 {st.topKecamatan}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Bottom Action Links */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                      <Link
                        href={`/map?provider=${encodeURIComponent(prov.id)}`}
                        className="text-[11px] font-bold text-slate-600 hover:text-blue-600 flex items-center gap-1 transition-colors"
                      >
                        <MapIcon className="w-3.5 h-3.5 text-blue-600" />
                        <span>Lihat di Peta</span>
                      </Link>

                      <Link
                        href={`/poles?provider=${encodeURIComponent(prov.id)}`}
                        className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] rounded-xl flex items-center gap-1 transition-colors"
                      >
                        <span>Lihat Semua Tiang ({st.count})</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 2: INPUT USER & TEAM RECAP                              */}
      {/* ============================================================ */}
      {activeTab === 'INPUT_USERS' && (
        <div className="space-y-3.5 animate-in fade-in">
          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  <span>Data Input per User &amp; Tim</span>
                </h2>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Tanggal aktif: <strong className="text-slate-800">{selectedDayStats.date}</strong>. Kominfo: Admin &amp; M. Tri. Bapenda: Yodi, Andika, Pradigga.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black whitespace-nowrap">
                Live Data
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 rounded-2xl p-3.5 bg-slate-950 text-white">
                <span className="text-[9px] uppercase font-black text-slate-300">Total Semua</span>
                <p className="text-3xl font-black font-mono leading-tight">{totalPolesCount}</p>
                <span className="text-[10px] text-slate-300">input tiang</span>
              </div>
              <div className="rounded-2xl p-3 bg-blue-50 border border-blue-100 min-h-[96px]">
                <span className="text-[9px] uppercase font-black text-blue-700">Input Tanggal Ini</span>
                <p className="text-2xl font-black font-mono text-blue-950 leading-tight">
                  {selectedDayStats.total}
                </p>
                <span className="text-[10px] text-blue-700 break-words">
                  {selectedDayStats.date === todayJakarta ? 'Hari ini' : selectedDayStats.date}
                </span>
              </div>
              <div className="rounded-2xl p-3 bg-amber-50 border border-amber-100 min-h-[96px]">
                <span className="text-[9px] uppercase font-black text-amber-800">Hari Terdata</span>
                <p className="text-2xl font-black font-mono text-amber-950 leading-tight">
                  {inputStats.daily.length}
                </p>
                <span className="text-[10px] text-amber-800">tanggal input</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {inputStats.teams.map((team) => {
              const isKominfo = team.team === 'KOMINFO';
              const selectedTeamTotal =
                team.team === 'KOMINFO'
                  ? selectedDayStats.kominfo
                  : team.team === 'BAPENDA'
                  ? selectedDayStats.bapenda
                  : selectedDayStats.lainnya;
              return (
                <div
                  key={team.team}
                  className={`rounded-3xl p-4 border shadow-[0_2px_12px_rgba(15,23,42,0.04)] ${
                    isKominfo
                      ? 'bg-blue-50/80 border-blue-100'
                      : 'bg-emerald-50/80 border-emerald-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className={`text-[10px] uppercase font-black ${isKominfo ? 'text-blue-700' : 'text-emerald-700'}`}>
                        {team.label}
                      </p>
                      <h3 className="text-lg font-black text-slate-900">
                        {selectedTeamTotal} Input
                      </h3>
                    </div>
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${isKominfo ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white/75 rounded-2xl p-2 border border-white">
                      <span className="text-slate-500 font-bold">Semua data</span>
                      <p className="font-black text-slate-900">{team.total} input</p>
                    </div>
                    <div className="bg-white/75 rounded-2xl p-2 border border-white">
                      <span className="text-slate-500 font-bold">Pangsa tanggal</span>
                      <p className="font-black text-slate-900">{formatPercent(selectedTeamTotal, selectedDayStats.total)}%</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ============================================================ */}
          {/* LANGKAH 1: FILTER TANGGAL INPUT DULUAN                        */}
          {/* ============================================================ */}
          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900">
                        Filter Tanggal Input
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black">
                        Langkah 1
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Pilih tanggal untuk melihat detail input petugas di bawah
                    </p>
                  </div>
                </div>
              </div>

              {/* Dropdown pemilih semua tanggal */}
              {inputStats.daily.length > 0 && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label htmlFor="select-input-date" className="text-[11px] font-bold text-slate-500 whitespace-nowrap hidden sm:inline">
                    Pilih Tanggal:
                  </label>
                  <select
                    id="select-input-date"
                    value={selectedDayStats.date}
                    onChange={(e) => setSelectedInputDate(e.target.value)}
                    className="w-full sm:w-auto text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-slate-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-sm"
                  >
                    {inputStats.daily.map((d) => (
                      <option key={d.date} value={d.date}>
                        {d.date === todayJakarta ? `🌟 Hari Ini (${d.date})` : d.date} — {d.total} tiang
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Quick Date Pills (scroll horizontal di HP) */}
            {inputStats.daily.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap mr-1 flex items-center gap-1">
                  <Clock3 className="w-3 h-3 text-slate-400" /> Cepat:
                </span>
                {inputStats.daily.slice(0, 6).map((d) => {
                  const isSelected = d.date === selectedDayStats.date;
                  const isToday = d.date === todayJakarta;
                  return (
                    <button
                      type="button"
                      key={d.date}
                      onClick={() => setSelectedInputDate(d.date)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 active:scale-95 flex-shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-black'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60'
                      }`}
                    >
                      <span>{isToday ? '🌟 Hari Ini' : d.date}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-600'
                        }`}
                      >
                        {d.total}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Banner status tanggal aktif */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/40 to-slate-50 border border-blue-100/90 p-3 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-xs font-bold text-slate-700">
                  Data Terpilih: <strong className="text-blue-950 font-black">{selectedDayStats.date === todayJakarta ? `Hari Ini (${selectedDayStats.date})` : selectedDayStats.date}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-white font-mono font-bold text-[11px] shadow-sm">
                  Total: {selectedDayStats.total} tiang
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-blue-100 text-blue-800 font-bold text-[11px]">
                  Kominfo: {selectedDayStats.kominfo}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                  Bapenda: {selectedDayStats.bapenda}
                </span>
                {selectedDayStats.lainnya > 0 && (
                  <span className="px-2.5 py-1 rounded-xl bg-slate-200 text-slate-700 font-bold text-[11px]">
                    Lainnya: {selectedDayStats.lainnya}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* LANGKAH 2: DETAIL TIAP USER / PETUGAS LAPANGAN               */}
          {/* ============================================================ */}
          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3.5">
            {/* Header Bagian Detail User */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Detail Input Tiap Petugas</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                    {filteredUsers.length} Petugas
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Rekap per petugas pada tanggal <strong className="text-slate-700">{selectedDayStats.date}</strong>
                </p>
              </div>

              {/* Filter Tim & Pencarian Petugas */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Team Filter Pills */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px]">
                  <button
                    type="button"
                    onClick={() => setUserTeamFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      userTeamFilter === 'ALL'
                        ? 'bg-white text-slate-900 shadow-sm font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua ({selectedUserStats.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserTeamFilter('KOMINFO')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      userTeamFilter === 'KOMINFO'
                        ? 'bg-blue-600 text-white shadow-sm font-black'
                        : 'text-slate-600 hover:text-blue-700'
                    }`}
                  >
                    Kominfo ({kominfoSurveyorCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserTeamFilter('BAPENDA')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      userTeamFilter === 'BAPENDA'
                        ? 'bg-emerald-600 text-white shadow-sm font-black'
                        : 'text-slate-600 hover:text-emerald-700'
                    }`}
                  >
                    Bapenda ({bapendaSurveyorCount})
                  </button>
                </div>

                {/* Search Bar Petugas */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Cari petugas..."
                    className="w-full sm:w-36 pl-8 pr-2.5 py-1 text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* A. TAMPILAN DESKTOP: TABEL RAPI & KOMPAK (hidden md:block) */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-100 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 border-b border-slate-100 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Petugas</th>
                    <th className="py-3 px-3">Tim</th>
                    <th className="py-3 px-3 text-center">Input ({selectedDayStats.date === todayJakarta ? 'Hari Ini' : selectedDayStats.date})</th>
                    <th className="py-3 px-3">Kondisi Fisik</th>
                    <th className="py-3 px-3 text-center">Total Akumulasi</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const isKominfo = user.team === 'KOMINFO';
                    const hasInput = user.selectedTotal > 0;
                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-blue-50/40 transition-colors group"
                      >
                        {/* Petugas */}
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 shadow-sm ${
                                isKominfo
                                  ? 'bg-blue-600 text-white'
                                  : user.team === 'BAPENDA'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-600 text-white'
                              }`}
                            >
                              {user.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-900 truncate">
                                {user.displayName}
                              </p>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {user.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Tim */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[9px] font-black ${
                                isKominfo
                                  ? 'bg-blue-100 text-blue-700'
                                  : user.team === 'BAPENDA'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {user.teamLabel}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-50 text-slate-500 border border-slate-200">
                              {user.roleLabel}
                            </span>
                          </div>
                        </td>

                        {/* Input Tanggal Terpilih */}
                        <td className="py-2.5 px-3 text-center">
                          {hasInput ? (
                            <div>
                              <span className="text-base font-black font-mono text-blue-600 leading-tight">
                                {user.selectedTotal}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-bold">
                                {formatPercent(user.selectedTotal, selectedDayStats.total)}% pangsa
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 font-mono font-bold">-</span>
                          )}
                        </td>

                        {/* Kondisi Fisik */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Baik: {user.goodCount}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Cek: {user.repairCount}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Rusak: {user.damagedCount}
                            </span>
                          </div>
                        </td>

                        {/* Total Akumulasi */}
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-mono font-black text-slate-800 text-sm">
                            {user.allTotal}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-bold">tiang</span>
                        </td>

                        {/* Aksi */}
                        <td className="py-2.5 px-4 text-right">
                          <Link
                            href={`/map?surveyor=${encodeURIComponent(user.id)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-[11px] font-bold transition-all shadow-sm active:scale-95"
                          >
                            <span>Lihat Titik</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* B. TAMPILAN MOBILE: DAFTAR BARIS RAMPING & PADAT (md:hidden) */}
            <div className="md:hidden space-y-2">
              {filteredUsers.map((user) => {
                const isKominfo = user.team === 'KOMINFO';
                const hasInputToday = user.selectedTotal > 0;
                return (
                  <Link
                    key={user.id}
                    href={`/map?surveyor=${encodeURIComponent(user.id)}`}
                    className={`block rounded-2xl border p-3 transition-all ${
                      hasInputToday
                        ? 'bg-white border-blue-100/90 shadow-[0_2px_10px_rgba(37,99,235,0.06)] active:scale-[0.99]'
                        : 'bg-slate-50/70 border-slate-100/80 hover:bg-white'
                    }`}
                  >
                    {/* Baris Atas: Profil Petugas + Angka Input Hari Ini */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 shadow-sm ${
                            isKominfo
                              ? 'bg-blue-600 text-white'
                              : user.team === 'BAPENDA'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-600 text-white'
                          }`}
                        >
                          {user.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-black text-slate-900 truncate">
                              {user.displayName}
                            </h4>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                                isKominfo
                                  ? 'bg-blue-100 text-blue-700'
                                  : user.team === 'BAPENDA'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {user.teamLabel}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {user.id}
                          </p>
                        </div>
                      </div>

                      {/* Angka Input Hari Ini */}
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-baseline justify-end gap-1">
                          <span
                            className={`text-lg font-black font-mono leading-none ${
                              hasInputToday ? 'text-blue-600' : 'text-slate-400'
                            }`}
                          >
                            {user.selectedTotal}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">input</span>
                        </div>
                        <span className="text-[9px] text-slate-400 block font-bold">
                          Tot: {user.allTotal}
                        </span>
                      </div>
                    </div>

                    {/* Baris Bawah: Mini Kondisi Fisik & Link Titik */}
                    <div className="mt-2 pt-2 border-t border-slate-100/90 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-100/60">
                          🟢 {user.goodCount}
                        </span>
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-100/60">
                          🟡 {user.repairCount}
                        </span>
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-100/60">
                          🔴 {user.damagedCount}
                        </span>
                      </div>

                      <span className="font-bold text-blue-600 flex items-center gap-0.5">
                        Lihat Titik <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Empty State jika tidak ada petugas */}
            {filteredUsers.length === 0 && (
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-6 text-center">
                <p className="text-xs font-bold text-slate-500">
                  Tidak ada petugas yang cocok dengan filter tim atau pencarian &quot;{userSearchQuery}&quot;.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setUserTeamFilter('ALL');
                    setUserSearchQuery('');
                  }}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-[11px] font-bold shadow-sm"
                >
                  Reset Filter
                </button>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* LANGKAH 3: RIWAYAT INPUT PER HARI (REKAP HARIAN LENGKAP)      */}
          {/* ============================================================ */}
          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Clock3 className="w-4 h-4 text-blue-600" />
                  <span>Riwayat Rekap Input per Hari</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Klik pada baris tanggal untuk melihat detail data hari tersebut di atas
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                5 data / hal
              </span>
            </div>

            <div className="space-y-2">
              {paginatedDaily.map((day) => {
                const isSelectedDay = day.date === selectedDayStats.date;
                return (
                  <button
                    type="button"
                    key={day.date}
                    onClick={() => setSelectedInputDate(day.date)}
                    className={`w-full text-left rounded-2xl border p-3 transition-all cursor-pointer ${
                      isSelectedDay
                        ? 'bg-blue-50 border-blue-200 shadow-[0_8px_22px_rgba(37,99,235,0.12)] ring-1 ring-blue-400'
                        : 'bg-slate-50/70 border-slate-100 hover:bg-white hover:border-blue-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                            isSelectedDay ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          <CalendarDays className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-black text-slate-900">
                          {day.date === todayJakarta ? `🌟 Hari Ini (${day.date})` : day.date}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelectedDay && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black">
                            Dipilih
                          </span>
                        )}
                        <span className="text-sm font-black font-mono text-slate-900">
                          {day.total} <span className="text-[10px] font-normal text-slate-500 font-sans">tiang</span>
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px]">
                      <span className="rounded-xl bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 font-bold">
                        Kominfo: {day.kominfo}
                      </span>
                      <span className="rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 font-bold">
                        Bapenda: {day.bapenda}
                      </span>
                      {day.lainnya > 0 && (
                        <span className="rounded-xl bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 font-bold">
                          Lainnya: {day.lainnya}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {inputStats.daily.length === 0 && (
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-6 text-center">
                  <p className="text-xs font-bold text-slate-500">Belum ada data input tiang.</p>
                </div>
              )}
            </div>

            {inputStats.daily.length > dailyPageSize && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setDailyPage((page) => Math.max(1, page - 1))}
                  disabled={dailyPage === 1}
                  className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-black disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
                >
                  Sebelumnya
                </button>
                <span className="text-[11px] font-bold text-slate-500">
                  Halaman {dailyPage} / {dailyTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setDailyPage((page) => Math.min(dailyTotalPages, page + 1))}
                  disabled={dailyPage === dailyTotalPages}
                  className="px-3 py-2 rounded-xl bg-blue-600 text-white text-[11px] font-black disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
                >
                  Selanjutnya
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 3: VISUAL GUIDE INFOGRAFIS RESMI                        */}
      {/* ============================================================ */}
      {activeTab === 'VISUAL_GUIDE' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Official Reference Infographic Banner */}
          <div className="bg-slate-950 rounded-3xl p-4 border border-slate-800 shadow-md space-y-2.5 text-white">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                <span>Infografis Standar Ciri Fisik Marka Tiang (1 - 20)</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800 font-bold">
                Standar Kota Lubuklinggau
              </span>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black border border-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/provider-pole-guide.jpg"
                alt="Panduan Ciri Warna Tiang Provider"
                className="w-full h-auto object-contain max-h-72 mx-auto"
              />
            </div>
          </div>

          {/* Grid of Visual Marking Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allProvidersList.map((prov) => {
              const st = providerStats.find((s) => s.provider.id === prov.id);
              const count = st?.count || 0;

              return (
                <div
                  key={prov.id}
                  className="bg-white rounded-3xl p-3.5 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex items-center gap-3.5 hover:border-blue-200 transition-colors"
                >
                  <div className="w-11 h-18 p-1 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center flex-shrink-0">
                    <PoleMiniGraphic provider={prov} height={56} />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="font-mono text-[9px] font-black px-1.5 py-0.2 rounded text-white"
                        style={{ backgroundColor: prov.colorHex || '#64748b' }}
                      >
                        {prov.code}
                      </span>
                      <h4 className="text-xs font-black text-slate-900 truncate">
                        {prov.name}
                      </h4>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-snug">
                      {prov.markingDescription || 'Warna identitas tiang resmi'}
                    </p>

                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-600 font-mono">
                        {count} Tiang Terdata
                      </span>

                      <Link
                        href={`/poles?provider=${encodeURIComponent(prov.id)}`}
                        className="text-[10px] font-bold text-slate-600 hover:text-blue-600 flex items-center gap-0.5"
                      >
                        <span>Data Tiang</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
