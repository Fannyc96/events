import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddButton } from './components/AddButton';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DatePicker } from './components/DatePicker';
import { EventDetail } from './components/EventDetail';
import { EventForm, type FormMode } from './components/EventForm';
import { EventList } from './components/EventList';
import { OptionsMenu } from './components/OptionsMenu';
import { ReviewPage } from './components/ReviewPage';
import { Timeline } from './components/Timeline';
import { Toast } from './components/Toast';
import { TopBar } from './components/TopBar';
import { useEvents } from './hooks/useEvents';
import { createEvent, deleteEvent, setStatus, updateEvent } from './lib/api';
import { shiftAnchor, titleFull, titleShort, todayIso, windowOf } from './lib/dates';
import { emptyForm, formFromEvent, type FormState } from './lib/form';
import type { EventInput, EventRow, Scale } from './lib/types';

type Popover = 'picker' | 'menu' | null;
interface ListState {
  title: string;
  ids: string[];
}
interface FormOpen {
  mode: FormMode;
  refId: string | null;
  initial: FormState;
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function App() {
  const today = todayIso();
  const { events, pending, loading, error, reload } = useEvents();

  const [tab, setTab] = useState<'timeline' | 'review'>('timeline');
  const [scale, setScale] = useState<Scale>('week');
  const [anchor, setAnchor] = useState(today);
  const [onlyImportant, setOnlyImportant] = useState(false);
  const [popover, setPopover] = useState<Popover>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [list, setList] = useState<ListState | null>(null);
  const [form, setForm] = useState<FormOpen | null>(null);
  const [confirmDel, setConfirmDel] = useState<EventRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // toast
  const [toast, setToast] = useState('');
  const timer = useRef<number>();
  const flash = useCallback((msg: string, ms = 1800) => {
    setToast(msg);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(''), ms);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const reloadQuiet = useCallback(() => void reload(), [reload]);

  const win = useMemo(() => windowOf(scale, anchor), [scale, anchor]);
  const visible = useMemo(() => (onlyImportant ? events.filter((e) => e.important) : events), [events, onlyImportant]);
  const byId = useMemo(() => new Map([...events, ...pending].map((e) => [e.id, e])), [events, pending]);
  const detail = detailId ? byId.get(detailId) : undefined;

  const openEvent = useCallback((id: string) => {
    setList(null);
    setDetailId(id);
  }, []);
  const openList = useCallback((title: string, ids: string[]) => {
    setDetailId(null);
    setList({ title, ids });
  }, []);
  const closeDetail = useCallback(() => setDetailId(null), []);
  const closeList = useCallback(() => setList(null), []);
  const closeForm = useCallback(() => setForm(null), []);
  const closePopover = useCallback(() => setPopover(null), []);

  const openForm = (mode: FormMode, initial: FormState, refId: string | null = null) => {
    setDetailId(null);
    setList(null);
    setForm({ mode, initial, refId });
  };

  const saveForm = async (value: EventInput) => {
    if (!form) return;
    setBusy(true);
    try {
      if (form.mode === 'add') await createEvent(value);
      else if (form.mode === 'edit') await updateEvent(form.refId!, value);
      else await updateEvent(form.refId!, { ...value, status: 'approved' });
      await reload();
      if (form.mode === 'add') setAnchor(value.start_date);
      setForm(null);
      flash(form.mode === 'edit' ? '已更新' : '已加入時間軸');
    } catch (e) {
      flash(`儲存失敗：${errText(e)}`, 4000);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    setBusy(true);
    try {
      await deleteEvent(confirmDel.id);
      await reload();
      setConfirmDel(null);
      setDetailId(null);
      flash('已刪除');
    } catch (e) {
      flash(`刪除失敗：${errText(e)}`, 4000);
    } finally {
      setBusy(false);
    }
  };

  const review = async (e: EventRow, status: 'approved' | 'dismissed') => {
    setBusyId(e.id);
    try {
      await setStatus(e.id, status);
      await reload();
      flash(status === 'approved' ? '已加入時間軸' : '已略過');
    } catch (err) {
      flash(`操作失敗：${errText(err)}`, 4000);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="app">

      <Timeline win={win} today={today} events={visible} onOpenEvent={openEvent} onOpenList={openList} />

      {/* 頁首放在畫面最下面 */}
      <TopBar
        title={titleShort(win)}
        titleFull={titleFull(win)}
        scale={scale}
        pendingCount={pending.length}
        pickerOpen={popover === 'picker'}
        menuOpen={popover === 'menu'}
        onPrev={() => setAnchor(shiftAnchor(scale, anchor, -1))}
        onNext={() => setAnchor(shiftAnchor(scale, anchor, 1))}
        onOpenPicker={() => setPopover(popover === 'picker' ? null : 'picker')}
        onScale={setScale}
        onReview={() => {
          setPopover(null);
          setTab('review');
        }}
        onMenu={() => setPopover(popover === 'menu' ? null : 'menu')}
      />

      {(loading && events.length === 0) || error ? (
        <div className="tl-status" role={error ? 'alert' : 'status'}>
          {error ? (
            <>
              <span>讀取失敗：{error}</span>
              <button className="btn" style={{ height: 40, padding: '0 20px' }} onClick={() => void reload()}>
                重試
              </button>
            </>
          ) : (
            <span>載入中…</span>
          )}
        </div>
      ) : null}

      <AddButton onClick={() => openForm('add', emptyForm(today))} />

      {popover === 'picker' && (
        <DatePicker
          scale={scale}
          anchor={anchor}
          today={today}
          onPick={(iso) => {
            setAnchor(iso);
            setPopover(null);
          }}
          onClose={closePopover}
        />
      )}
      {popover === 'menu' && (
        <OptionsMenu onlyImportant={onlyImportant} onToggleImportant={() => setOnlyImportant((v) => !v)} onClose={closePopover} />
      )}

      {tab === 'review' && (
        <>
          <ReviewPage
            pending={pending}
            busyId={busyId}
            onBack={() => setTab('timeline')}
            onSkip={(e) => void review(e, 'dismissed')}
            onApprove={(e) => void review(e, 'approved')}
            onEdit={(e) => openForm('review', formFromEvent(e), e.id)}
            onReload={reloadQuiet}
            flash={flash}
          />
          <AddButton onClick={() => openForm('add', emptyForm(today))} />
        </>
      )}

      {list && (
        <EventList
          title={list.title}
          events={list.ids.map((id) => byId.get(id)).filter((e): e is EventRow => !!e)}
          onOpen={openEvent}
          onClose={closeList}
        />
      )}

      {detail && (
        <EventDetail
          event={detail}
          onClose={closeDetail}
          onEdit={() => openForm('edit', formFromEvent(detail), detail.id)}
          onDelete={() => setConfirmDel(detail)}
        />
      )}

      {form && <EventForm mode={form.mode} initial={form.initial} busy={busy} onSave={(v) => void saveForm(v)} onClose={closeForm} />}

      {confirmDel && (
        <ConfirmDialog
          message={`確定要刪除「${confirmDel.title}」嗎？`}
          confirmText="刪除"
          busy={busy}
          onConfirm={() => void doDelete()}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      <Toast message={toast} />
    </div>
  );
}
