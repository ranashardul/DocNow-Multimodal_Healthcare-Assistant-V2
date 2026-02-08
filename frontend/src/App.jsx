import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Mic,
  MicOff,
  Image as ImageIcon,
  Sparkles,
  Volume2,
  Pause,
  X,
  RotateCcw,
  Trash2,
  Download,
} from "lucide-react"
import { jsPDF } from "jspdf"

import { analyze } from "./api/analyze"
import { transcribeAudio } from "./api/transcribe"
import { speakText } from "./api/tts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

/* ───────── Recording Animation ───────── */
const RecordingIndicator = () => (
  <div className="flex flex-col items-center gap-3 py-4">
    <motion.div
      animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
      transition={{ repeat: Infinity, duration: 1.3 }}
      className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center"
    >
      <Mic className="text-red-500 w-6 h-6" />
    </motion.div>

    <div className="flex gap-1 h-4">
      {[...Array(5)].map((_, i) => (
        <motion.span
          key={i}
          className="w-1 bg-red-400 rounded-full"
          animate={{ height: ["30%", "100%", "40%"] }}
          transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.12 }}
        />
      ))}
    </div>

    <p className="text-xs text-red-300">Listening…</p>
  </div>
)

/* ───────── Speaking Animation ───────── */
const SpeakingIndicator = () => (
  <div className="flex items-center justify-center gap-2 py-3">
    {[...Array(4)].map((_, i) => (
      <motion.span
        key={i}
        className="w-1 bg-indigo-400 rounded-full"
        animate={{ height: ["35%", "100%", "45%"] }}
        transition={{ repeat: Infinity, duration: 0.75, delay: i * 0.15 }}
      />
    ))}
    <span className="text-xs text-slate-400 ml-2">
      DocNow is speaking…
    </span>
  </div>
)

export default function App() {
  const [messages, setMessages] = useState([])
  const [latestResult, setLatestResult] = useState(null)

  const [text, setText] = useState("")
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [audioText, setAudioText] = useState("")

  const [audioUrl, setAudioUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [playingIndex, setPlayingIndex] = useState(null)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const audioRef = useRef(null)
  const resultRef = useRef(null)

  /* ───────── Image Preview ───────── */
  useEffect(() => {
    if (!imageFile) return
    const url = URL.createObjectURL(imageFile)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  /* ───────── Reset ───────── */
  const resetAll = () => {
    setMessages([])
    setLatestResult(null)
    setText("")
    setImageFile(null)
    setImagePreview(null)
    setAudioText("")
    setAudioUrl(null)
    setIsSpeaking(false)
    setPlayingIndex(null)
    setLoading(false)

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
    }

    toast({ title: "Ready for a new query" })
  }

  /* ───────── Voice Recording ───────── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)

      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data)
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        const file = new File([blob], "voice.webm", { type: "audio/webm" })
        const res = await transcribeAudio(file)
        setAudioText(res.transcription)
        toast({ title: "Voice captured" })
      }

      recorder.start()
      setRecording(true)
    } catch {
      toast({ variant: "destructive", title: "Microphone access denied" })
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current.stop()
    setRecording(false)
  }

  /* ───────── Analyze ───────── */
  const handleAnalyze = async () => {
    const finalText = audioText || text
    if (!finalText && !imageFile) {
      toast({ variant: "destructive", title: "No input provided" })
      return
    }

    const updated = [
      ...messages,
      { role: "user", content: finalText || "Shared an image" },
    ]

    setMessages(updated)
    setLoading(true)
    setLatestResult(null)
    setAudioUrl(null)
    setIsSpeaking(false)

    try {
      const res = await analyze({ messages: updated, image: imageFile })

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.response },
      ])
      setLatestResult(res.response)

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 120)
    } catch {
      toast({ variant: "destructive", title: "Analysis failed" })
    } finally {
      setLoading(false)
      setText("")
      setAudioText("")
      setImageFile(null)
      setImagePreview(null)
    }
  }

  /* ───────── Play / Pause Toggle ───────── */
  const handleListen = async (text, index) => {
    if (playingIndex === index && !audioRef.current.paused) {
      audioRef.current.pause()
      setIsSpeaking(false)
      setPlayingIndex(null)
      return
    }

    const blob = await speakText(text)
    const url = URL.createObjectURL(blob)

    setAudioUrl(url)
    setPlayingIndex(index)

    setTimeout(() => {
      audioRef.current.play()
      setIsSpeaking(true)
    }, 100)
  }

  /* ───────── PDF Download ───────── */
  const downloadPDF = () => {
    const doc = new jsPDF()
    const pageHeight = doc.internal.pageSize.height
    let y = 15

    messages.forEach((msg, index) => {
      const label = msg.role === "user" ? "You:" : "DocNow:"
      const textLines = doc.splitTextToSize(msg.content, 170)

      if (y + textLines.length * 6 > pageHeight - 20) {
        doc.addPage()
        y = 15
      }

      doc.setFont("helvetica", "bold")
      doc.text(label, 15, y)
      y += 7

      doc.setFont("helvetica", "normal")
      doc.text(textLines, 20, y)
      y += textLines.length * 6 + 8

      if (index < messages.length - 1) {
        doc.setDrawColor(180)
        doc.line(15, y, 195, y)
        y += 8
      }
    })

    doc.save("docnow-session.pdf")
  }

  const hasInput = Boolean(text || audioText || imageFile)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white px-6 py-12">
      {/* HEADER */}
      <div className="text-center space-y-2 mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Doc<span className="text-indigo-400">Now</span>
        </h1>
        <p className="text-slate-400 text-sm">
          A calm, AI-powered health assistant
        </p>
      </div>

      <motion.div
        layout
        className={`mx-auto grid gap-8 ${
          messages.length ? "max-w-6xl md:grid-cols-2" : "max-w-2xl"
        }`}
      >
        {/* LEFT PANEL */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-xl relative">
          {messages.length > 0 && (
            <button
              onClick={resetAll}
              className="absolute top-4 right-4 flex items-center gap-1 text-xs text-white"
            >
              <RotateCcw size={14} /> New Query
            </button>
          )}

          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Sparkles className="text-indigo-400" />
              Tell me what’s bothering you
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe your symptoms in simple words…"
              className="w-full min-h-[110px] rounded-xl bg-slate-900/80 p-4 text-sm text-white border border-white/15"
            />

            {(text || audioText || imageFile) && (
              <div className="flex gap-2 flex-wrap">
                {text && <Badge variant="secondary">Text</Badge>}
                {audioText && <Badge variant="secondary">Voice</Badge>}
                {imageFile && <Badge variant="secondary">Image</Badge>}
              </div>
            )}

            {audioText && (
              <Button
                variant="ghost"
                className="w-full text-red-400 border border-red-500/20"
                onClick={() => setAudioText("")}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove Recorded Voice
              </Button>
            )}

            {!imagePreview ? (
              <label className="flex items-center justify-center gap-2 p-4 border border-dashed border-white/20 rounded-xl cursor-pointer hover:border-indigo-400">
                <ImageIcon className="text-indigo-400" />
                Upload an image (optional)
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => setImageFile(e.target.files[0])}
                />
              </label>
            ) : (
              <div className="relative">
                <img
                  src={imagePreview}
                  className="rounded-xl max-h-60 w-full object-cover"
                />
                <button
                  onClick={() => {
                    setImageFile(null)
                    setImagePreview(null)
                  }}
                  className="absolute top-2 right-2 bg-black/70 p-1 rounded-full"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {recording ? (
              <>
                <RecordingIndicator />
                <Button variant="destructive" onClick={stopRecording}>
                  <MicOff className="mr-2" />
                  Stop Recording
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={startRecording}>
                <Mic className="mr-2" />
                Record Voice
              </Button>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={!hasInput || loading}
              className="w-full bg-indigo-600"
            >
              {loading ? "Thinking…" : "Analyze"}
            </Button>
          </CardContent>
        </Card>

        {/* RIGHT PANEL */}
        <AnimatePresence>
          {messages.length > 0 && (
            <motion.div ref={resultRef}>
              <Card className="bg-slate-900/80 border-white/10">
                <CardHeader className="flex justify-between items-center">
                  <CardTitle className="text-white">Conversation</CardTitle>
                  <Button size="sm" onClick={downloadPDF}>
                    <Download size={14} />
                    <span className="ml-2">Download Chat</span>
                  </Button>
                </CardHeader>

                <CardContent className="space-y-4 max-h-[520px] overflow-y-auto">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`rounded-xl p-4 max-w-[85%] ${
                        msg.role === "user"
                          ? "ml-auto bg-indigo-600 text-white"
                          : "bg-slate-800 text-slate-100"
                      }`}
                    >
                      <pre className="whitespace-pre-wrap">{msg.content}</pre>

                      {msg.role === "assistant" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2"
                          onClick={() => handleListen(msg.content, i)}
                        >
                          {playingIndex === i && isSpeaking ? (
                            <Pause size={14} />
                          ) : (
                            <Volume2 size={14} />
                          )}
                        </Button>
                      )}
                    </div>
                  ))}

                  {isSpeaking && <SpeakingIndicator />}

                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => {
                      setIsSpeaking(false)
                      setPlayingIndex(null)
                    }}
                    hidden
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
