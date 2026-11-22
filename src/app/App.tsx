/* Interview Practice for people who stutter: draw a question, take think time, answer out loud
   (optionally recorded), then rate the attempt and track anxiety, avoidance and "said what I
   wanted" over time. Includes a self-disclosure opener. Recordings stay on the device. */
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Copy, Dice5, History, Mic, Shuffle } from "lucide-react";
import { AppShell, type Section } from "@/shell/AppShell";
import { Button, Field, Input, Panel, ResponsiveTable, Select, cx } from "@/shell/ui";
import { LineChart } from "@/shell/LineChart";
import { References } from "@/shell/References";
import { usePersistent } from "@/shell/storage";
import { toast } from "@/shell/toast";
import { copyText, downloadCSV, fmtDate, saveFile, todayISO } from "@/shell/lib";
import { ANSWER_SECONDS, STATEMENTS, TECHS, THINK_SECONDS, type Attempt, mmss, pickQuestion } from "./interview";
import refs from "./refs.json";

type Phase = "idle" | "think" | "answer" | "rate";
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export default function App() {
  const { t } = useTranslation();
  const [view, setView] = useState("practice");
  const [log, setLog] = usePersistent<Attempt[]>("sip-log", []);

  const [phase, setPhase] = useState<Phase>("idle");
  const [q, setQ] = useState("");
  const [left, setLeft] = useState(0);
  const [wantRec, setWantRec] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const usedSecsRef = useRef(0);
  const canRec = typeof navigator !== "undefined" && !!navigator.mediaDevices && typeof window !== "undefined" && "MediaRecorder" in window;

  // rating form
  const [rate, setRate] = useState({ anx: 5, avoid: 5, said: 5, techs: [] as number[], note: "" });
  // disclosure
  const [dName, setDName] = useState("");
  const [dStyle, setDStyle] = useState(0);

  const stopRecording = useCallback(() => {
    const r = recRef.current;
    if (r && r.state !== "inactive") r.stop();
    recRef.current = null;
  }, []);

  const finish = useCallback(() => {
    usedSecsRef.current = ANSWER_SECONDS - left;
    stopRecording(); setRecording(false); setPhase("rate");
    setRate({ anx: 5, avoid: 5, said: 5, techs: [], note: "" });
  }, [left, stopRecording]);

  const startAnswer = useCallback(async () => {
    setPhase("answer"); setLeft(ANSWER_SECONDS);
    if (wantRec && canRec) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunksRef.current = [];
        const rec = new MediaRecorder(stream);
        rec.ondataavailable = e => chunksRef.current.push(e.data);
        rec.onstop = () => { stream.getTracks().forEach(tr => tr.stop()); setAudioURL(URL.createObjectURL(new Blob(chunksRef.current, { type: rec.mimeType }))); };
        rec.start(); recRef.current = rec; setRecording(true);
      } catch { toast("Microphone not available. Practising without recording."); recRef.current = null; }
    }
  }, [wantRec, canRec]);

  // one ticking timer for think and answer phases
  useEffect(() => {
    if (phase !== "think" && phase !== "answer") return;
    const id = setInterval(() => setLeft(l => l - 1), 1000);
    return () => clearInterval(id);
  }, [phase]);
  useEffect(() => {
    if (left > 0) return;
    if (phase === "think") void startAnswer();
    else if (phase === "answer") finish();
  }, [left, phase, startAnswer, finish]);

  const draw = () => {
    if (audioURL) { URL.revokeObjectURL(audioURL); setAudioURL(null); }
    setQ(pickQuestion(log.map(x => x.q))); setPhase("think"); setLeft(THINK_SECONDS);
  };
  const saveRating = () => {
    setLog(l => [...l, { id: uid(), date: todayISO(), q, secs: usedSecsRef.current, anx: rate.anx, avoid: rate.avoid, said: rate.said, techs: rate.techs, note: rate.note.trim() }]);
    toast("Saved"); setPhase("idle");
  };
  const toggleTech = (i: number, on: boolean) => setRate(r => ({ ...r, techs: on ? [...r.techs, i] : r.techs.filter(x => x !== i) }));
  const downloadRec = () => { if (audioURL) saveFile(chunksRef.current.length ? new Blob(chunksRef.current) : new Blob([]), `interview-practice-${todayISO()}.webm`, "audio/webm"); };
  const csv = () => downloadCSV([["date", "question", "answer_seconds", "anxiety", "avoidance", "said_what_wanted", "techniques", "note"],
    ...log.map(x => [x.date, x.q, x.secs, x.anx, x.avoid, x.said, x.techs.map(i => TECHS[i]).join("; "), x.note])], `interview-practice-${todayISO()}.csv`);

  const sections: Section[] = [{ id: "practice", label: "Practice", icon: Dice5 }, { id: "disclose", label: "Opener", icon: Mic }, { id: "history", label: "Progress", icon: History }];
  const go = (id: string) => { if (phase !== "idle" && phase !== "rate") return; setView(id); window.scrollTo({ top: 0 }); };

  const slider = (key: "anx" | "avoid" | "said", label: string, hint: string) => (
    <Field label={label} hint={hint}>{id => (
      <div className="flex items-center gap-3">
        <input id={id} type="range" min={0} max={10} value={rate[key]} onChange={e => setRate(r => ({ ...r, [key]: Number(e.target.value) }))} className="h-11 flex-1 accent-[var(--color-accent)]" />
        <b className="w-6 text-center tabular-nums">{rate[key]}</b>
      </div>)}</Field>
  );

  return (
    <AppShell title={t("appName")} subtitle={t("appSub")} sections={sections} active={view} onSection={go}
      footer={<><p className="m-0">{t("disclaimer")}</p><p className="m-0">Recordings are made on your device and are not uploaded anywhere.</p></>}>
      <div className="mx-auto grid max-w-2xl gap-5">

        {view === "practice" && (
          <>
            <Panel>
              <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
                {phase === "idle" && <>
                  <p className="m-0 text-[0.85rem] font-semibold uppercase tracking-wide text-muted">Ready when you are</p>
                  <p className="m-0 text-xl font-bold">Draw an interview question</p>
                  <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-[var(--color-ink)]" checked={wantRec} disabled={!canRec} onChange={e => setWantRec(e.target.checked)} />
                    <span>Record my answer{canRec ? "" : " (not supported in this browser)"}</span></label>
                  <Button variant="primary" onClick={draw}><Shuffle className="h-4 w-4" aria-hidden />Draw a question</Button>
                </>}
                {phase === "think" && <>
                  <p className="m-0 text-[0.85rem] font-semibold uppercase tracking-wide text-accent">Think time</p>
                  <p className="m-0 text-xl font-bold">{q}</p>
                  <p className="m-0 flex items-center gap-2 text-4xl font-bold tabular-nums"><Clock className="h-7 w-7" aria-hidden />{mmss(left)}</p>
                  <Button variant="primary" onClick={() => { setLeft(0); }}>Start answering now</Button>
                </>}
                {phase === "answer" && <>
                  <p className="m-0 text-[0.85rem] font-semibold uppercase tracking-wide text-accent">Answer out loud{recording && <span className="ml-2 text-high">● recording</span>}</p>
                  <p className="m-0 text-xl font-bold">{q}</p>
                  <p className="m-0 flex items-center gap-2 text-4xl font-bold tabular-nums"><Clock className="h-7 w-7" aria-hidden />{mmss(left)}</p>
                  <Button variant="primary" onClick={finish}>I've finished</Button>
                </>}
                {phase === "rate" && <>
                  <p className="m-0 text-[0.85rem] font-semibold uppercase tracking-wide text-ok">Done</p>
                  <p className="m-0 text-lg font-bold">{q}</p>
                  {audioURL && <audio controls src={audioURL} className="w-full max-w-sm" />}
                  {audioURL && <Button onClick={downloadRec}>Download recording</Button>}
                </>}
              </div>
            </Panel>

            {phase === "rate" && (
              <Panel title="How did it go?">
                {slider("anx", "How anxious did you feel?", "0 calm, 10 very anxious")}
                {slider("avoid", "How much did you avoid or switch words?", "0 not at all, 10 a lot")}
                {slider("said", "Did you say what you wanted to say?", "0 not at all, 10 completely")}
                <fieldset className="mt-4 border-0 p-0"><legend className="text-[0.92rem] font-bold">What did you use?</legend>
                  <div className="mt-1 flex flex-wrap gap-2">{TECHS.map((x, i) => (
                    <label key={i} className={cx("flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-[0.9rem]", rate.techs.includes(i) ? "border-ink bg-ink text-paper" : "border-line bg-paper")}>
                      <input type="checkbox" className="sr-only" checked={rate.techs.includes(i)} onChange={e => toggleTech(i, e.target.checked)} />{x}</label>))}</div>
                </fieldset>
                <Field label="Note to self">{id => <Input id={id} maxLength={140} value={rate.note} onChange={e => setRate(r => ({ ...r, note: e.target.value }))} />}</Field>
                <div className="mt-4 flex gap-2"><Button variant="primary" onClick={saveRating}>Save and draw another</Button><Button variant="quiet" onClick={() => setPhase("idle")}>Skip</Button></div>
              </Panel>
            )}
            {phase === "idle" && <References refs={refs} contextQuery="interview practice anxiety avoidance disclosure" contextLabel="Why practice helps" />}
          </>
        )}

        {view === "disclose" && (
          <Panel title="Self-disclosure opener">
            <p className="m-0 text-[0.95rem] text-muted">A short line at the start of an interview to say you stutter. Telling the listener early tends to lower anxiety and leaves a better impression.</p>
            <Field label="Your name (optional)">{id => <Input id={id} value={dName} onChange={e => setDName(e.target.value)} />}</Field>
            <Field label="Style">{id => <Select id={id} value={dStyle} onChange={e => setDStyle(Number(e.target.value))}><option value={0}>Brief and polite</option><option value={1}>Clear instruction to the listener</option><option value={2}>Confident and warm</option></Select>}</Field>
            <div className="mt-3 rounded-lg border border-line bg-paper p-4"><p className="m-0 text-[1.02rem]">{STATEMENTS[dStyle](dName.trim())}</p></div>
            <div className="mt-3"><Button onClick={async () => toast(await copyText(STATEMENTS[dStyle](dName.trim())) ? "Copied" : "Select the text to copy it.")}><Copy className="h-4 w-4" aria-hidden />Copy</Button></div>
            <References refs={refs} contextQuery="self-disclosure stuttering interview listener" contextLabel="Evidence on disclosure" />
          </Panel>
        )}

        {view === "history" && (
          <>
            <Panel title="Progress" action={<Button size="sm" onClick={csv} disabled={!log.length}>CSV</Button>}>
              {log.length >= 2 ? (
                <LineChart yMin={0} yMax={10} yLabel="0–10"
                  series={[
                    { label: "Anxiety", color: "var(--color-high)", points: log.map(x => ({ x: new Date(x.date + "T12:00"), y: x.anx })) },
                    { label: "Avoidance", color: "var(--color-mid)", points: log.map(x => ({ x: new Date(x.date + "T12:00"), y: x.avoid })) },
                    { label: "Said what I wanted", color: "var(--color-ok)", points: log.map(x => ({ x: new Date(x.date + "T12:00"), y: x.said })) }]}
                  dateLabel={d => fmtDate(d, "en", { day: "numeric", month: "short" })} />
              ) : <p className="m-0 text-muted">Practise twice or more to see a chart.</p>}
              <div className="mt-4">
                <ResponsiveTable rows={[...log].reverse().slice(0, 20)} rowKey={x => x.id ?? x.date + x.q} empty="No practice yet."
                  columns={[
                    { header: "Date", cell: x => fmtDate(x.date) }, { header: "Question", cell: x => x.q },
                    { header: "Anxiety", cell: x => x.anx, className: "tabular-nums" }, { header: "Avoidance", cell: x => x.avoid, className: "tabular-nums" },
                    { header: "Said it", cell: x => x.said, className: "tabular-nums" }, { header: "Used", cell: x => x.techs.map(i => TECHS[i]).join(", ") || "–" }]} />
              </div>
            </Panel>
          </>
        )}
      </div>
    </AppShell>
  );
}
