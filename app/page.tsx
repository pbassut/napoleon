"use client"

import React from "react"

import { useState, useEffect, useMemo, useRef } from "react"
import { create } from "zustand"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  GitBranch,
  Folder,
  Activity,
  ChevronDown,
  ChevronRight,
  Command,
  X,
  FileText,
  Check,
  Loader2,
  ChevronLeft,
  ArrowUp,
  Paperclip,
  ArrowDown,
  Undo2,
  Link,
} from "lucide-react"

// SVG icon components for each tool
function FinderIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="4" fill="#3B99FC" />
      <path
        d="M6 8.5C6 8.22386 6.22386 8 6.5 8H9.5C9.77614 8 10 8.22386 10 8.5V11.5C10 11.7761 9.77614 12 9.5 12H6.5C6.22386 12 6 11.7761 6 11.5V8.5Z"
        fill="white"
      />
      <path
        d="M10.5 8C10.2239 8 10 8.22386 10 8.5V11.5C10 11.7761 10.2239 12 10.5 12H13.5C13.7761 12 14 11.7761 14 11.5V8.5C14 8.22386 13.7761 8 13.5 8H10.5Z"
        fill="white"
        fillOpacity="0.6"
      />
    </svg>
  )
}

function CursorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="4" fill="#000000" />
      <path d="M5 5L15 10L10 11L9 16L5 5Z" fill="url(#cursor-gradient)" stroke="white" strokeWidth="0.5" />
      <defs>
        <linearGradient id="cursor-gradient" x1="5" y1="5" x2="15" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00D4FF" />
          <stop offset="1" stopColor="#7B61FF" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function VSCodeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="4" fill="#007ACC" />
      <path d="M14 4L8 10L5 7.5L4 8.5L8 12L15 5L14 4Z" fill="white" />
    </svg>
  )
}

function XcodeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="4" fill="#147EFB" />
      <path
        d="M6 6L10 10L6 14M10 14H14"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ITermIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="4" fill="#00FF00" />
      <rect x="3" y="3" width="14" height="14" rx="1" fill="#000000" />
      <path d="M5 7L7 9L5 11M9 11H13" stroke="#00FF00" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function WarpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="4" fill="#01A4FF" />
      <path d="M5 10C5 10 7 6 10 6C13 6 15 10 15 10C15 10 13 14 10 14C7 14 5 10 5 10Z" fill="white" />
      <circle cx="10" cy="10" r="2" fill="#01A4FF" />
    </svg>
  )
}

function TerminalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="4" fill="#4D4D4D" />
      <path d="M5 7L8 10L5 13M9 13H13" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Types
type WorkspaceStatus = "working" | "idle" | "error" | "creating"

interface Workspace {
  id: string
  name: string
  branch: string
  status: WorkspaceStatus
  additions: number
  deletions: number
  createdAt: Date
  projectId: string
}

interface Project {
  id: string
  name: string
  path: string
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  collapsible?: boolean
  collapsed?: boolean
  toolCalls?: number
  messageCount?: number
  actions?: MessageAction[]
  diff?: MessageDiff
}

interface MessageAction {
  type: "edit" | "read"
  label: string
  file?: string
  additions?: number
  deletions?: number
}

interface MessageDiff {
  file: string
  additions: number
  deletions: number
  content: string
}

interface TerminalTab {
  id: string
  name: string
}

interface FileDiff {
  path: string
  status: "modified" | "added" | "deleted"
  additions: number
  deletions: number
  hunks: DiffHunk[]
}

interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]
}

interface DiffLine {
  type: "add" | "remove" | "context" | "header"
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

// Zustand Store
interface WorkspaceStore {
  projects: Project[]
  workspaces: Workspace[]
  selectedWorkspaceId: string | null
  lastUsedApp: string
  expandedProjects: Record<string, boolean> // Changed from Set to Record for proper serialization
  commandKeyPressed: boolean
  diffPanelOpen: boolean
  selectedDiffFile: string | null
  selectedModel: string
  leftPanelWidth: number // Added panel size state
  rightPanelWidth: number // Added panel size state
  filesHeightPercent: number // Added panel size state
  setSelectedWorkspace: (id: string) => void
  deleteWorkspace: (id: string) => void
  addWorkspace: (workspace: Workspace) => void
  setLastUsedApp: (app: string) => void
  toggleProject: (projectId: string) => void
  setCommandKeyPressed: (pressed: boolean) => void
  setDiffPanelOpen: (open: boolean) => void
  setSelectedDiffFile: (path: string | null) => void
  setSelectedModel: (model: string) => void
  setLeftPanelWidth: (width: number) => void // Added panel size state
  setRightPanelWidth: (width: number) => void // Added panel size state
  setFilesHeightPercent: (percent: number) => void // Added panel size state
}

const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  projects: [
    { id: "1", name: "my-app", path: "~/Projects/my-app" },
    { id: "2", name: "client-dashboard", path: "~/Projects/client-dashboard" },
    { id: "3", name: "api-service", path: "~/Projects/api-service" },
  ],
  workspaces: [
    {
      id: "1",
      name: "prague",
      branch: "feature/auth-system",
      status: "working",
      additions: 234,
      deletions: 67,
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
      projectId: "1",
    },
    {
      id: "2",
      name: "tokyo",
      branch: "fix/database-migration",
      status: "idle",
      additions: 89,
      deletions: 23,
      createdAt: new Date(Date.now() - 15 * 60 * 1000),
      projectId: "1",
    },
    {
      id: "3",
      name: "berlin",
      branch: "feature/ui-redesign",
      status: "working",
      additions: 456,
      deletions: 123,
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      projectId: "2",
    },
    {
      id: "4",
      name: "london",
      branch: "refactor/api-endpoints",
      status: "error",
      additions: 12,
      deletions: 45,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      projectId: "2",
    },
    {
      id: "5",
      name: "paris",
      branch: "feature/payment-integration",
      status: "creating",
      additions: 0,
      deletions: 0,
      createdAt: new Date(Date.now() - 1 * 60 * 1000),
      projectId: "3",
    },
  ],
  selectedWorkspaceId: "1",
  lastUsedApp: "iterm",
  expandedProjects: { "1": true, "2": true, "3": true }, // Changed from Set to object
  commandKeyPressed: false,
  diffPanelOpen: false,
  selectedDiffFile: null,
  selectedModel: "opus",
  leftPanelWidth: 288, // Added default panel size
  rightPanelWidth: 384, // Added default panel size
  filesHeightPercent: 40, // Added default panel size
  setSelectedWorkspace: (id) => set({ selectedWorkspaceId: id }),
  deleteWorkspace: (id) =>
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.id !== id),
      selectedWorkspaceId:
        state.selectedWorkspaceId === id ? state.workspaces[0]?.id || null : state.selectedWorkspaceId,
    })),
  addWorkspace: (workspace) =>
    set((state) => ({
      workspaces: [...state.workspaces, workspace],
    })),
  setLastUsedApp: (app) => set({ lastUsedApp: app }),
  toggleProject: (projectId) =>
    set((state) => ({
      expandedProjects: {
        ...state.expandedProjects,
        [projectId]: !state.expandedProjects[projectId],
      },
    })),
  setCommandKeyPressed: (pressed) => set({ commandKeyPressed: pressed }),
  setDiffPanelOpen: (open) => set({ diffPanelOpen: open }),
  setSelectedDiffFile: (path) => set({ selectedDiffFile: path }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setLeftPanelWidth: (width) => set({ leftPanelWidth: width }), // Added panel size setter
  setRightPanelWidth: (width) => set({ rightPanelWidth: width }), // Added panel size setter
  setFilesHeightPercent: (percent) => set({ filesHeightPercent: percent }), // Added panel size setter
}))

// Utility function for time ago
function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function StatusIndicator({ status }: { status: WorkspaceStatus }) {
  const colors = {
    working: "#50fa7b",
    idle: "#f1fa8c",
    error: "#ff5555",
    creating: "#8be9fd",
  }

  return (
    <motion.div
      className="w-2 h-2 rounded-full"
      style={{ backgroundColor: colors[status] }}
      animate={{
        opacity: status === "working" ? [1, 0.3, 1] : 1,
      }}
      transition={{
        duration: 1.5,
        repeat: status === "working" ? Number.POSITIVE_INFINITY : 0,
        ease: "easeInOut",
      }}
    />
  )
}

function OpenInDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const lastUsedApp = useWorkspaceStore((state) => state.lastUsedApp)
  const setLastUsedApp = useWorkspaceStore((state) => state.setLastUsedApp)

  const apps = [
    { id: "finder", name: "Finder", icon: <FinderIcon /> },
    { id: "cursor", name: "Cursor", icon: <CursorIcon /> },
    { id: "vscode", name: "VS Code", icon: <VSCodeIcon /> },
    { id: "xcode", name: "Xcode", icon: <XcodeIcon /> },
    { id: "iterm", name: "iTerm", icon: <ITermIcon />, shortcut: "⌘O" },
    { id: "warp", name: "Warp", icon: <WarpIcon /> },
    { id: "terminal", name: "Terminal", icon: <TerminalIcon /> },
  ]

  const lastUsedAppData = apps.find((app) => app.id === lastUsedApp)
  const otherApps = apps.filter((app) => app.id !== lastUsedApp)

  const handleAppSelect = (appId: string) => {
    setLastUsedApp(appId)
    setIsOpen(false)
    console.log("[v0] Opening workspace in:", appId)
  }

  const handleOpenInLastUsed = () => {
    console.log("[v0] Opening workspace in:", lastUsedApp)
  }

  return (
    <div className="relative flex">
      {/* Left side: Open in last used app */}
      <button
        onClick={handleOpenInLastUsed}
        className="flex items-center gap-2 bg-[#1a1a1a] text-white pl-3 pr-3 py-2 rounded-l-lg text-sm font-medium hover:bg-[#252525] transition-colors border border-[#333] border-r-0"
      >
        {lastUsedAppData?.icon}
        <span>{lastUsedAppData?.name}</span>
      </button>

      {/* Right side: Dropdown */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center bg-[#1a1a1a] text-white px-2 py-2 rounded-r-lg hover:bg-[#252525] transition-colors border border-[#333] border-l border-l-[#252525]"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-2 right-0 w-64 bg-[#1a1a1a] rounded-lg border border-[#333] shadow-2xl overflow-hidden z-20"
            >
              {/* Last used app - smaller height at top */}
              {lastUsedAppData && (
                <button
                  onClick={() => handleAppSelect(lastUsedAppData.id)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#252525] transition-colors border-b border-[#333] bg-[#1a1a1a]"
                >
                  {lastUsedAppData.icon}
                  <span className="text-sm text-white font-medium">{lastUsedAppData.name}</span>
                  {lastUsedAppData.shortcut && (
                    <span className="ml-auto text-xs text-[#9ca3af] font-mono">{lastUsedAppData.shortcut}</span>
                  )}
                </button>
              )}

              {/* Other apps */}
              <div className="py-1">
                {otherApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => handleAppSelect(app.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#252525] transition-colors"
                  >
                    {app.icon}
                    <span className="text-sm text-white">{app.name}</span>
                    {app.shortcut && <span className="ml-auto text-xs text-[#9ca3af] font-mono">{app.shortcut}</span>}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function WorkspaceListItem({
  workspace,
  isSelected,
  index,
}: { workspace: Workspace; isSelected: boolean; index: number }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const setSelectedWorkspace = useWorkspaceStore((state) => state.setSelectedWorkspace)
  const commandKeyPressed = useWorkspaceStore((state) => state.commandKeyPressed)

  const shortcutNumber = (index % 9) + 1

  return (
    <motion.button
      layout
      onClick={() => setSelectedWorkspace(workspace.id)}
      className={`relative w-full text-left px-2.5 py-2 rounded-md transition-all duration-150 ${
        isSelected
          ? "bg-[#1a1a1a] border border-[#2a2a2a]"
          : "bg-transparent border border-transparent hover:bg-[#1a1a1a]/40"
      }`}
    >
      <div className="flex items-start justify-between mb-1.5">
        <h3 className="text-base font-semibold text-white truncate pr-2">{workspace.name}</h3>
        <div className="flex items-center gap-1.5">
          <StatusIndicator status={workspace.status} />
          {commandKeyPressed && <span className="text-sm text-[#6b7280] font-mono ml-1">⌘{shortcutNumber}</span>}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[#9ca3af] text-xs font-mono mb-1.5">
        <GitBranch className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{workspace.branch}</span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="px-1.5 py-0.5 rounded bg-[#50fa7b]/10 text-[#50fa7b]">+{workspace.additions}</span>
          <span className="px-1.5 py-0.5 rounded bg-[#ff5555]/10 text-[#ff5555]">-{workspace.deletions}</span>
        </div>
        <span
          className="relative text-[#6b7280] text-xs"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {timeAgo(workspace.createdAt)}

          {/* Tooltip with full date - only on timestamp */}
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute bottom-full right-0 mb-2 px-2.5 py-1.5 bg-[#0d0d0d] border border-[#2a2a2a] rounded text-xs text-white whitespace-nowrap z-30 pointer-events-none shadow-xl"
              >
                {workspace.createdAt.toLocaleString()}
                <div className="absolute top-full right-4 -mt-px border-4 border-transparent border-t-[#2a2a2a]" />
              </motion.div>
            )}
          </AnimatePresence>
        </span>
      </div>
    </motion.button>
  )
}

function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
      <div className="bg-[#252525] rounded-lg p-3 border border-[#333] flex items-center gap-1.5">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="w-2 h-2 rounded-full bg-[#50fa7b]"
            animate={{
              y: [0, -10, 0],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: index * 0.2,
              times: [0, 0.5, 1],
            }}
          />
        ))}
      </div>
    </motion.div>
  )
}

function Terminal({ tabId }: { tabId: string }) {
  const [history, setHistory] = useState<string[]>([
    "Welcome to Napoleon Terminal",
    "Type 'help' for available commands",
    "",
  ])
  const [currentInput, setCurrentInput] = useState("")
  const [cursorVisible, setCursorVisible] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev)
    }, 530)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [history])

  const handleCommand = (command: string) => {
    const trimmedCommand = command.trim()
    if (!trimmedCommand) {
      setHistory((prev) => [...prev, "$ ", ""])
      return
    }

    let output = ""
    switch (trimmedCommand.toLowerCase()) {
      case "help":
        output = "Available commands: help, clear, ls, pwd, echo [text]"
        break
      case "clear":
        setHistory(["Welcome to Napoleon Terminal", "Type 'help' for available commands", ""])
        setCurrentInput("")
        return
      case "ls":
        output = "src/  components/  lib/  public/  package.json  README.md"
        break
      case "pwd":
        output = "/Users/napoleon/workspace"
        break
      default:
        if (trimmedCommand.startsWith("echo ")) {
          output = trimmedCommand.substring(5)
        } else {
          output = `Command not found: ${trimmedCommand}`
        }
    }

    setHistory((prev) => [...prev, `$ ${trimmedCommand}`, output, ""])
    setCurrentInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCommand(currentInput)
    }
  }

  return (
    <div
      ref={terminalRef}
      onClick={() => inputRef.current?.focus()}
      className="h-full w-full bg-[#0d0d0d] rounded-md p-4 overflow-y-auto font-mono text-base text-[#f8f8f2] cursor-text"
      style={{ fontFamily: 'Menlo, Monaco, "Courier New", monospace' }}
    >
      {history.map((line, index) => (
        <div key={`${tabId}-${index}`} className="leading-relaxed">
          {line}
        </div>
      ))}
      <div className="flex items-center">
        <span className="text-[#50fa7b]">$ </span>
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none border-none text-[#f8f8f2] ml-1"
          autoFocus
          spellCheck={false}
        />
        <span className={`inline-block w-2 h-4 bg-[#50fa7b] ml-1 ${cursorVisible ? "opacity-100" : "opacity-0"}`} />
      </div>
    </div>
  )
}

const mockDiffData: FileDiff[] = [
  {
    path: "src/components/auth/LoginForm.tsx",
    status: "modified",
    additions: 45,
    deletions: 12,
    hunks: [
      {
        oldStart: 15,
        oldLines: 8,
        newStart: 15,
        newLines: 12,
        lines: [
          { type: "context", content: "export function LoginForm() {", oldLineNumber: 15, newLineNumber: 15 },
          {
            type: "context",
            content: "  const [email, setEmail] = useState('')",
            oldLineNumber: 16,
            newLineNumber: 16,
          },
          { type: "remove", content: "  const [password, setPassword] = useState('')", oldLineNumber: 17 },
          { type: "add", content: "  const [password, setPassword] = useState<string>('')", newLineNumber: 17 },
          { type: "add", content: "  const [isLoading, setIsLoading] = useState(false)", newLineNumber: 18 },
          { type: "context", content: "", oldLineNumber: 18, newLineNumber: 19 },
          { type: "remove", content: "  const handleSubmit = (e: FormEvent) => {", oldLineNumber: 19 },
          { type: "add", content: "  const handleSubmit = async (e: FormEvent) => {", newLineNumber: 20 },
          { type: "context", content: "    e.preventDefault()", oldLineNumber: 20, newLineNumber: 21 },
          { type: "add", content: "    setIsLoading(true)", newLineNumber: 22 },
          { type: "add", content: "    try {", newLineNumber: 23 },
          { type: "add", content: "      await login(email, password)", newLineNumber: 24 },
          { type: "add", content: "    } catch (error) {", newLineNumber: 25 },
          { type: "add", content: "      console.error(error)", newLineNumber: 26 },
          { type: "add", content: "    } finally {", newLineNumber: 27 },
          { type: "add", content: "      setIsLoading(false)", newLineNumber: 28 },
          { type: "add", content: "    }", newLineNumber: 29 },
          { type: "context", content: "  }", oldLineNumber: 21, newLineNumber: 30 },
        ],
      },
    ],
  },
  {
    path: "src/lib/api/auth.ts",
    status: "modified",
    additions: 23,
    deletions: 8,
    hunks: [
      {
        oldStart: 5,
        oldLines: 6,
        newStart: 5,
        newLines: 10,
        lines: [
          { type: "context", content: "import { api } from './client'", oldLineNumber: 5, newLineNumber: 5 },
          { type: "add", content: "import { z } from 'zod'", newLineNumber: 6 },
          { type: "context", content: "", oldLineNumber: 6, newLineNumber: 7 },
          { type: "add", content: "const loginSchema = z.object({", newLineNumber: 8 },
          { type: "add", content: "  email: z.string().email(),", newLineNumber: 9 },
          { type: "add", content: "  password: z.string().min(8),", newLineNumber: 10 },
          { type: "add", content: "})", newLineNumber: 11 },
          { type: "add", content: "", newLineNumber: 12 },
          {
            type: "remove",
            content: "export async function login(email: string, password: string) {",
            oldLineNumber: 7,
          },
          {
            type: "add",
            content: "export async function login(email: string, password: string): Promise<User> {",
            newLineNumber: 13,
          },
          { type: "add", content: "  const validated = loginSchema.parse({ email, password })", newLineNumber: 14 },
          {
            type: "context",
            content: "  return api.post('/auth/login', { email, password })",
            oldLineNumber: 8,
            newLineNumber: 15,
          },
          { type: "context", content: "}", oldLineNumber: 9, newLineNumber: 16 },
        ],
      },
    ],
  },
  {
    path: "src/types/user.ts",
    status: "added",
    additions: 15,
    deletions: 0,
    hunks: [
      {
        oldStart: 0,
        oldLines: 0,
        newStart: 1,
        newLines: 15,
        lines: [
          { type: "add", content: "export interface User {", newLineNumber: 1 },
          { type: "add", content: "  id: string", newLineNumber: 2 },
          { type: "add", content: "  email: string", newLineNumber: 3 },
          { type: "add", content: "  name: string", newLineNumber: 4 },
          { type: "add", content: "  avatar?: string", newLineNumber: 5 },
          { type: "add", content: "  createdAt: Date", newLineNumber: 6 },
          { type: "add", content: "  updatedAt: Date", newLineNumber: 7 },
          { type: "add", content: "}", newLineNumber: 8 },
          { type: "add", content: "", newLineNumber: 9 },
          { type: "add", content: "export interface AuthResponse {", newLineNumber: 10 },
          { type: "add", content: "  user: User", newLineNumber: 11 },
          { type: "add", content: "  token: string", newLineNumber: 12 },
          { type: "add", content: "  expiresAt: Date", newLineNumber: 13 },
          { type: "add", content: "}", newLineNumber: 14 },
        ],
      },
    ],
  },
  {
    path: "src/components/layout/Header.tsx",
    status: "modified",
    additions: 8,
    deletions: 3,
    hunks: [
      {
        oldStart: 12,
        oldLines: 5,
        newStart: 12,
        newLines: 8,
        lines: [
          { type: "context", content: "export function Header() {", oldLineNumber: 12, newLineNumber: 12 },
          { type: "add", content: "  const { user } = useAuth()", newLineNumber: 13 },
          { type: "context", content: "  return (", oldLineNumber: 13, newLineNumber: 14 },
          { type: "remove", content: '    <header className="bg-white">', oldLineNumber: 14 },
          { type: "add", content: '    <header className="bg-white shadow-sm">', newLineNumber: 15 },
          { type: "context", content: "      <nav>", oldLineNumber: 15, newLineNumber: 16 },
          { type: "add", content: "        {user && <UserMenu user={user} />}", newLineNumber: 17 },
          { type: "context", content: "      </nav>", oldLineNumber: 16, newLineNumber: 18 },
          { type: "context", content: "    </header>", oldLineNumber: 17, newLineNumber: 19 },
        ],
      },
    ],
  },
  {
    path: "tests/auth.test.ts",
    status: "added",
    additions: 67,
    deletions: 0,
    hunks: [
      {
        oldStart: 0,
        oldLines: 0,
        newStart: 1,
        newLines: 20,
        lines: [
          { type: "add", content: "import { describe, it, expect } from 'vitest'", newLineNumber: 1 },
          { type: "add", content: "import { login } from '../src/lib/api/auth'", newLineNumber: 2 },
          { type: "add", content: "", newLineNumber: 3 },
          { type: "add", content: "describe('Authentication', () => {", newLineNumber: 4 },
          { type: "add", content: "  it('should login with valid credentials', async () => {", newLineNumber: 5 },
          {
            type: "add",
            content: "    const result = await login('test@example.com', 'password123')",
            newLineNumber: 6,
          },
          { type: "add", content: "    expect(result).toBeDefined()", newLineNumber: 7 },
          { type: "add", content: "    expect(result.user).toBeDefined()", newLineNumber: 8 },
          { type: "add", content: "    expect(result.token).toBeDefined()", newLineNumber: 9 },
          { type: "add", content: "  })", newLineNumber: 10 },
          { type: "add", content: "", newLineNumber: 11 },
          {
            type: "add",
            content: "  it('should throw error with invalid credentials', async () => {",
            newLineNumber: 12,
          },
          { type: "add", content: "    await expect(", newLineNumber: 13 },
          { type: "add", content: "      login('test@example.com', 'wrong')", newLineNumber: 14 },
          { type: "add", content: "    ).rejects.toThrow()", newLineNumber: 15 },
          { type: "add", content: "  })", newLineNumber: 16 },
          { type: "add", content: "})", newLineNumber: 17 },
        ],
      },
    ],
  },
]

function DiffViewerPanel({ workspace }: { workspace: Workspace }) {
  const diffPanelOpen = useWorkspaceStore((state) => state.diffPanelOpen)
  const setDiffPanelOpen = useWorkspaceStore((state) => state.setDiffPanelOpen)
  const selectedDiffFile = useWorkspaceStore((state) => state.selectedDiffFile)
  const setSelectedDiffFile = useWorkspaceStore((state) => state.setSelectedDiffFile)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const currentFileIndex = mockDiffData.findIndex((f) => f.path === selectedDiffFile)
  const currentFile = mockDiffData[currentFileIndex]

  const totalStats = mockDiffData.reduce(
    (acc, file) => ({
      additions: acc.additions + file.additions,
      deletions: acc.deletions + file.deletions,
    }),
    { additions: 0, deletions: 0 },
  )

  const handleNextFile = () => {
    if (currentFileIndex < mockDiffData.length - 1) {
      setSelectedDiffFile(mockDiffData[currentFileIndex + 1].path)
    }
  }

  const handlePrevFile = () => {
    if (currentFileIndex > 0) {
      setSelectedDiffFile(mockDiffData[currentFileIndex - 1].path)
    }
  }

  useEffect(() => {
    if (!diffPanelOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        handleNextFile()
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        handlePrevFile()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [diffPanelOpen, currentFileIndex])

  const getFileIcon = (path: string) => {
    const ext = path.split(".").pop()
    const colors: Record<string, string> = {
      tsx: "#3178c6",
      ts: "#3178c6",
      js: "#f7df1e",
      jsx: "#61dafb",
      css: "#264de4",
      json: "#5a5a5a",
    }
    return colors[ext || ""] || "#9ca3af"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "added":
        return "text-[#50fa7b]"
      case "modified":
        return "text-[#f1fa8c]"
      case "deleted":
        return "text-[#ff5555]"
      default:
        return "text-[#9ca3af]"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "added":
        return "A"
      case "modified":
        return "M"
      case "deleted":
        return "D"
      default:
        return "?"
    }
  }

  useEffect(() => {
    if (diffPanelOpen && !selectedDiffFile && mockDiffData.length > 0) {
      setSelectedDiffFile(mockDiffData[0].path)
    }
  }, [diffPanelOpen, selectedDiffFile, setSelectedDiffFile])

  return (
    <AnimatePresence>
      {diffPanelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setDiffPanelOpen(false)}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-1/2 bg-[#0d0d0d] z-50 flex flex-col border-l border-[#1a1a1a] shadow-2xl"
          >
            {/* Header - Sticky */}
            <div className="h-14 flex-shrink-0 border-b border-[#1a1a1a] bg-[#0d0d0d] flex items-center justify-between px-4 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-white">{workspace.name}</h2>
                <div className="flex items-center gap-1.5 text-[#9ca3af] text-xs font-mono">
                  <GitBranch className="w-3 h-3" />
                  <span>{workspace.branch}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="px-1.5 py-0.5 rounded bg-[#50fa7b]/10 text-[#50fa7b]">+{totalStats.additions}</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#ff5555]/10 text-[#ff5555]">-{totalStats.deletions}</span>
                  <span className="text-[#6b7280]">| {mockDiffData.length} files</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDiffPanelOpen(false)}
                  className="p-1.5 text-[#9ca3af] hover:text-white hover:bg-[#1a1a1a] rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Content: File Tree + Diff Viewer */}
            <div className="flex-1 flex overflow-hidden">
              {/* File Tree Sidebar - 20% width */}
              <div className="w-1/5 border-r border-[#1a1a1a] bg-[#0d0d0d] overflow-y-auto">
                <div className="p-2">
                  <h3 className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider mb-2 px-2">
                    Changed Files
                  </h3>
                  <div className="space-y-0.5">
                    {mockDiffData.map((file) => (
                      <div key={file.path} className="relative group">
                        <button
                          onClick={() => setSelectedDiffFile(file.path)}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                            selectedDiffFile === file.path
                              ? "bg-[#1a1a1a] text-white"
                              : "text-[#9ca3af] hover:bg-[#1a1a1a]/40 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: getFileIcon(file.path) }}
                            />
                            <span className={`text-[10px] font-bold ${getStatusColor(file.status)}`}>
                              {getStatusLabel(file.status)}
                            </span>
                          </div>
                          <p className="font-mono text-xs truncate">{file.path.split("/").pop()}</p>
                          <p className="text-[10px] text-[#6b7280] truncate">
                            {file.path.split("/").slice(0, -1).join("/")}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[9px] text-[#50fa7b]">+{file.additions}</span>
                            <span className="text-[9px] text-[#ff5555]">-{file.deletions}</span>
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            console.log("[v0] Revert file:", file.path)
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-[#9ca3af] hover:text-[#ff5555] hover:bg-[#1a1a1a] rounded transition-all"
                          title="Revert file"
                        >
                          <Undo2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Diff Viewer - 80% width */}
              <div className="flex-1 overflow-y-auto bg-[#0d0d0d]">
                {currentFile ? (
                  <div className="p-4">
                    {/* File breadcrumb */}
                    <div className="mb-4 pb-3 border-b border-[#1a1a1a]">
                      <div className="flex items-center gap-2 text-xs font-mono text-[#9ca3af]">
                        <span className={`font-bold ${getStatusColor(currentFile.status)}`}>
                          {getStatusLabel(currentFile.status)}
                        </span>
                        <span className="text-white">{currentFile.path}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-mono">
                        <span className="text-[#50fa7b]">+{currentFile.additions} additions</span>
                        <span className="text-[#ff5555]">-{currentFile.deletions} deletions</span>
                      </div>
                    </div>

                    {/* Diff hunks */}
                    <div className="space-y-4">
                      {currentFile.hunks.map((hunk, hunkIndex) => (
                        <div key={hunkIndex} className="border border-[#1a1a1a] rounded-md overflow-hidden">
                          {/* Hunk header */}
                          <div className="bg-[#1a1a1a] px-3 py-1.5 text-xs font-mono text-[#8be9fd]">
                            @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                          </div>

                          {/* Diff lines - increased font size from text-[11px] to text-sm */}
                          <div className="font-mono text-sm">
                            {hunk.lines.map((line, lineIndex) => {
                              const bgColor =
                                line.type === "add"
                                  ? "bg-[#0f4c2a]"
                                  : line.type === "remove"
                                    ? "bg-[#4c0f0f]"
                                    : "bg-transparent"
                              const textColor =
                                line.type === "add"
                                  ? "text-[#50fa7b]"
                                  : line.type === "remove"
                                    ? "text-[#ff5555]"
                                    : "text-[#f8f8f2]"
                              const prefix = line.type === "add" ? "+" : line.type === "remove" ? "-" : " "

                              return (
                                <div
                                  key={lineIndex}
                                  className={`flex ${bgColor} hover:bg-opacity-80 transition-colors`}
                                >
                                  {/* Line numbers */}
                                  <div className="flex-shrink-0 flex">
                                    <span className="w-12 text-right px-2 text-[#6b7280] select-none">
                                      {line.oldLineNumber || ""}
                                    </span>
                                    <span className="w-12 text-right px-2 text-[#6b7280] select-none border-r border-[#1a1a1a]">
                                      {line.newLineNumber || ""}
                                    </span>
                                  </div>

                                  {/* Line content */}
                                  <div className={`flex-1 px-3 py-0.5 ${textColor}`}>
                                    <span className="select-none mr-2">{prefix}</span>
                                    <span>{line.content}</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-[#6b7280] text-sm">
                    Select a file to view changes
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Toolbar */}
            <div className="h-12 flex-shrink-0 border-t border-[#1a1a1a] bg-[#0d0d0d] flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 bg-[#1a1a1a] text-white text-xs font-medium rounded hover:bg-[#252525] transition-colors">
                  Revert All
                </button>
                <span className="text-[10px] text-[#6b7280] font-mono">
                  Viewing {currentFileIndex + 1} of {mockDiffData.length} files
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevFile}
                  disabled={currentFileIndex === 0}
                  className="p-1.5 text-[#9ca3af] hover:text-white hover:bg-[#1a1a1a] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextFile}
                  disabled={currentFileIndex === mockDiffData.length - 1}
                  className="p-1.5 text-[#9ca3af] hover:text-white hover:bg-[#1a1a1a] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function FileChangesList() {
  const setDiffPanelOpen = useWorkspaceStore((state) => state.setDiffPanelOpen)
  const setSelectedDiffFile = useWorkspaceStore((state) => state.setSelectedDiffFile)

  const changedFiles = [
    { path: "src/components/auth/LoginForm.tsx", additions: 45, deletions: 12, status: "modified" },
    { path: "src/lib/api/auth.ts", additions: 23, deletions: 8, status: "modified" },
    { path: "src/types/user.ts", additions: 15, deletions: 0, status: "added" },
    { path: "src/components/layout/Header.tsx", additions: 8, deletions: 3, status: "modified" },
    { path: "tests/auth.test.ts", additions: 67, deletions: 0, status: "added" },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "added":
        return "text-[#50fa7b]"
      case "modified":
        return "text-[#f1fa8c]"
      case "deleted":
        return "text-[#ff5555]"
      default:
        return "text-[#9ca3af]"
    }
  }

  const handleFileClick = (filePath: string) => {
    setSelectedDiffFile(filePath)
    setDiffPanelOpen(true)
  }

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] rounded-md border border-[#2a2a2a] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a] bg-[#151515]">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-[#9ca3af]" />
          <h3 className="text-sm font-semibold text-white">Changed Files</h3>
          <span className="text-xs text-[#6b7280] font-mono">({changedFiles.length})</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-1.5 py-0.5 rounded bg-[#50fa7b]/10 text-[#50fa7b]">+158</span>
          <span className="px-1.5 py-0.5 rounded bg-[#ff5555]/10 text-[#ff5555]">-23</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {changedFiles.map((file, index) => (
          <motion.button
            key={file.path}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handleFileClick(file.path)}
            className="w-full text-left px-3 py-2 hover:bg-[#252525] transition-colors border-b border-[#1a1a1a] last:border-b-0 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-mono truncate">{file.path}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`text-xs font-semibold uppercase ${getStatusColor(file.status)}`}>
                    {file.status.charAt(0)}
                  </span>
                  <span className="text-xs text-[#50fa7b] font-mono">+{file.additions}</span>
                  <span className="text-xs text-[#ff5555] font-mono">-{file.deletions}</span>
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

function TerminalTabs() {
  const [terminalTabs, setTerminalTabs] = useState<TerminalTab[]>([{ id: "1", name: "Terminal 1" }])
  const [activeTerminalTab, setActiveTerminalTab] = useState("1")

  const handleAddTerminalTab = () => {
    const newId = (terminalTabs.length + 1).toString()
    const newTab: TerminalTab = {
      id: newId,
      name: `Terminal ${terminalTabs.length + 1}`,
    }
    setTerminalTabs([...terminalTabs, newTab])
    setActiveTerminalTab(newId)
  }

  const handleCloseTerminalTab = (tabId: string) => {
    if (terminalTabs.length === 1) return // Don't close the last tab

    const newTabs = terminalTabs.filter((tab) => tab.id !== tabId)
    setTerminalTabs(newTabs)

    if (activeTerminalTab === tabId) {
      setActiveTerminalTab(newTabs[0].id)
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] rounded-md border border-[#2a2a2a] overflow-hidden">
      {/* Tabs Header */}
      <div className="flex items-center border-b border-[#2a2a2a] bg-[#151515] flex-shrink-0">
        {terminalTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTerminalTab(tab.id)}
            className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeTerminalTab === tab.id
                ? "text-white bg-[#1a1a1a]"
                : "text-[#9ca3af] hover:text-white hover:bg-[#252525]"
            }`}
          >
            <span>{tab.name}</span>
            {terminalTabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleCloseTerminalTab(tab.id)
                }}
                className={`p-0.5 rounded ${activeTerminalTab === tab.id ? "hover:bg-red-500/30" : "hover:bg-[#252525]"}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </button>
        ))}
        <button
          onClick={handleAddTerminalTab}
          className="ml-auto px-3 py-2 text-[#9ca3af] hover:text-white hover:bg-[#252525] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-hidden p-3">
        <Terminal tabId={activeTerminalTab} />
      </div>
    </div>
  )
}

function ChatView({ workspace }: { workspace: Workspace }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: `Workspace "${workspace.name}" is ready. I'm monitoring the ${workspace.branch} branch. How can I help you today?`,
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
    },
    {
      id: "2",
      role: "assistant",
      content: "I've successfully created a comprehensive Product Requirements Document (PRD) for Napoleon.",
      timestamp: new Date(Date.now() - 1 * 60 * 1000),
      collapsible: true,
      collapsed: false,
      toolCalls: 4,
      messageCount: 2,
      actions: [{ type: "read", label: "Read 430 lines", file: "docs/prd.md" }],
      diff: {
        file: "docs/prd.md",
        additions: 89,
        deletions: 1,
        content: `  1  # Napoleon Product Requirements Document (PRD)
  2
  3  ## Goals and Background Context
+ 4  ## Checklist Results Report
+ 5
+ 6  ### Executive Summary
+ 7
+ 8  **Overall PRD Completeness**: 92% - The PRD is comprehensive
+ 9  **MVP Scope Appropriateness**: Just Right - Scope delivers
+ 10 **Readiness for Architecture Phase**: Ready - Requirements
+ 11 **Most Critical Gaps**: No blocking issues identified, minor`,
      },
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const [showUndoOptions, setShowUndoOptions] = useState<string | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const setCommandKeyPressed = useWorkspaceStore((state) => state.setCommandKeyPressed)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputValue])

  // Scroll detection
  useEffect(() => {
    const container = chatContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setShowScrollButton(!isNearBottom)
    }

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [])

  // Command+L to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "l") {
        e.preventDefault()
        textareaRef.current?.focus()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages([...messages, newMessage])
    setInputValue("")

    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm processing your request. This is a simulated response.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    }, 1000)
  }

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      })
    }
  }

  const handleRevert = (messageId: string, type: "all" | "conversation" | "code") => {
    console.log("[v0] Revert:", type, "for message:", messageId)
    setShowUndoOptions(null)
  }

  return (
    // Changed div to flex container for horizontal split
    <div className="h-full flex flex-col">
      {/* Chat Header - Sticky */}
      <div className="h-14 flex-shrink-0 border-b border-[#1a1a1a] bg-[#0d0d0d] flex items-center justify-between px-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-white">{workspace.name}</h2>
          <div className="flex items-center gap-1.5 text-[#9ca3af] text-xs font-mono">
            <GitBranch className="w-3 h-3" />
            <span>{workspace.branch}</span>
          </div>
        </div>
        {/* Added workspace prop to OpenInDropdown */}
        <OpenInDropdown workspace={workspace} />
      </div>

      {/* Chat Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 relative">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} relative group`}
              onMouseEnter={() => setHoveredMessageId(message.id)}
              onMouseLeave={() => {
                setHoveredMessageId(null)
                setShowUndoOptions(null)
              }}
            >
              {message.collapsible ? (
                <div className="max-w-[80%] relative">
                  <CollapsibleMessage message={message} />
                  {hoveredMessageId === message.id && (
                    <div className="absolute -left-8 top-2">
                      <button
                        onClick={() => setShowUndoOptions(showUndoOptions === message.id ? null : message.id)}
                        className="p-1 text-[#9ca3af] hover:text-white hover:bg-[#1a1a1a] rounded transition-colors"
                        title="Undo to this point"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                      {showUndoOptions === message.id && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute left-0 top-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md shadow-xl z-50 py-1 min-w-[200px]"
                        >
                          <button
                            onClick={() => handleRevert(message.id, "all")}
                            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#252525] transition-colors"
                          >
                            Revert code and conversation
                          </button>
                          <button
                            onClick={() => handleRevert(message.id, "conversation")}
                            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#252525] transition-colors"
                          >
                            Revert conversation only
                          </button>
                          <button
                            onClick={() => handleRevert(message.id, "code")}
                            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#252525] transition-colors"
                          >
                            Revert code only
                          </button>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-[80%] relative">
                  <div
                    className={`rounded-md p-2.5 ${
                      message.role === "user"
                        ? "bg-[#50fa7b] text-black"
                        : "bg-[#151515] text-white border border-[#2a2a2a]"
                    }`}
                  >
                    <p className="text-base leading-relaxed">{message.content}</p>
                    <p className="text-xs mt-1 opacity-60">
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {hoveredMessageId === message.id && message.role === "assistant" && (
                    <div className="absolute -left-8 top-2">
                      <button
                        onClick={() => setShowUndoOptions(showUndoOptions === message.id ? null : message.id)}
                        className="p-1 text-[#9ca3af] hover:text-white hover:bg-[#1a1a1a] rounded transition-colors"
                        title="Undo to this point"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                      {showUndoOptions === message.id && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute left-0 top-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md shadow-xl z-50 py-1 min-w-[200px]"
                        >
                          <button
                            onClick={() => handleRevert(message.id, "all")}
                            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#252525] transition-colors"
                          >
                            Revert code and conversation
                          </button>
                          <button
                            onClick={() => handleRevert(message.id, "conversation")}
                            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#252525] transition-colors"
                          >
                            Revert conversation only
                          </button>
                          <button
                            onClick={() => handleRevert(message.id, "code")}
                            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#252525] transition-colors"
                          >
                            Revert code only
                          </button>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}

          {workspace.status === "working" && <TypingIndicator />}
        </AnimatePresence>

        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={scrollToBottom}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] text-white text-sm rounded-full border border-[#2a2a2a] shadow-lg hover:bg-[#252525] transition-colors"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Scroll to bottom</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Chat Input */}
      <div className="relative bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] focus-within:border-[#50fa7b] transition-colors p-4">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSendMessage()
            }
          }}
          placeholder="Ask to make changes, @mention files, run /commands"
          className="w-full bg-transparent text-white text-base px-0 py-0 pr-24 resize-none outline-none min-h-[48px] max-h-[200px]"
          rows={1}
        />
        <div className="absolute right-4 top-4 flex items-center gap-2 text-[#6b7280] text-xs font-mono pointer-events-none">
          <span>⌘L to focus</span>
        </div>
        {/* Input Actions */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <ModelSelector />
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#9ca3af] hover:text-white hover:bg-[#1a1a1a] rounded-md border border-[#2a2a2a] transition-colors">
              <Link className="w-3.5 h-3.5" />
              <span>Link issue</span>
              <span className="text-xs font-mono">⌘I</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 text-[#9ca3af] hover:text-white hover:bg-[#1a1a1a] rounded-md transition-colors">
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="p-2 bg-[#50fa7b] text-black rounded-md hover:bg-[#50fa7b]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function NewWorkspaceCard({ projectId }: { projectId: string }) {
  const [state, setState] = useState<"idle" | "creating" | "success" | "error">("idle")
  const [currentStep, setCurrentStep] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [cityName, setCityName] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const commandKeyPressed = useWorkspaceStore((state) => state.commandKeyPressed)
  const addWorkspace = useWorkspaceStore((state) => state.addWorkspace)

  const steps = [
    "Creating worktree...",
    "Checking out branch...",
    "Running npm install...",
    "Setting up environment...",
    "Launching Claude Code...",
  ]

  const cities = ["marseille", "barcelona", "amsterdam", "copenhagen", "vienna", "oslo", "dublin", "lisbon"]

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (state === "creating") {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [state])

  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (state === "creating" && currentStep < steps.length) {
      timeout = setTimeout(() => {
        setCurrentStep((prev) => prev + 1)
      }, 2000)
    } else if (state === "creating" && currentStep === steps.length) {
      // All steps complete
      setState("success")
      setTimeout(() => {
        // Create the actual workspace
        const newWorkspace: Workspace = {
          id: Date.now().toString(),
          name: cityName,
          branch: `feature/${cityName}-${Date.now()}`,
          status: "idle",
          additions: 0,
          deletions: 0,
          createdAt: new Date(),
          projectId,
        }
        addWorkspace(newWorkspace)
        // Reset state
        setState("idle")
        setCurrentStep(0)
        setElapsedTime(0)
        setCityName("")
      }, 1000)
    }
    return () => clearTimeout(timeout)
  }, [state, currentStep, steps.length, cityName, projectId, addWorkspace])

  const handleCreate = () => {
    // Assign random city name
    const randomCity = cities[Math.floor(Math.random() * cities.length)]
    setCityName(randomCity)
    setState("creating")
    setCurrentStep(0)
    setElapsedTime(0)
  }

  const handleCancel = () => {
    setState("idle")
    setCurrentStep(0)
    setElapsedTime(0)
    setCityName("")
  }

  const handleRetry = () => {
    setState("idle")
    setErrorMessage("")
    handleCreate()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (state === "idle") {
    return (
      <button
        onClick={handleCreate}
        className="relative w-full text-left px-2.5 py-2 rounded-md border border-dashed border-[#2a2a2a] hover:border-[#50fa7b]/30 hover:bg-[#1a1a1a]/30 transition-all duration-150 group"
      >
        <div className="flex items-center gap-2 text-[#6b7280] group-hover:text-[#50fa7b]">
          <Plus className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">New Workspace</span>
        </div>

        {/* Keyboard shortcut badge */}
        <AnimatePresence>
          {commandKeyPressed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-1 py-0.5"
            >
              <Command className="w-2.5 h-2.5 text-[#6b7280]" />
              <span className="text-[9px] text-[#6b7280] font-mono">N</span>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    )
  }

  if (state === "creating") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full px-2.5 py-3 rounded-md border border-[#3b82f6] bg-[#1a1a1a] shadow-lg"
      >
        {/* Pulsing border animation */}
        <motion.div
          className="absolute inset-0 rounded-md border-2 border-[#3b82f6]"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />

        <div className="relative">
          {/* Header with city name and cancel button */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white">{cityName}</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#6b7280] font-mono">{formatTime(elapsedTime)}</span>
              <button onClick={handleCancel} className="text-[#6b7280] hover:text-[#ff5555] transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="space-y-1.5">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-2">
                {index < currentStep ? (
                  <Check className="w-3 h-3 text-[#10b981] flex-shrink-0" />
                ) : index === currentStep ? (
                  <Loader2 className="w-3 h-3 text-[#3b82f6] animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-[#2a2a2a] flex-shrink-0" />
                )}
                <span
                  className={`text-[11px] font-mono ${
                    index < currentStep ? "text-[#10b981]" : index === currentStep ? "text-[#3b82f6]" : "text-[#6b7280]"
                  }`}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-1 bg-[#0d0d0d] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#3b82f6]"
              initial={{ width: "0%" }}
              animate={{ width: `${(currentStep / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Step counter */}
          <div className="mt-1.5 text-[10px] text-[#6b7280] font-mono text-center">
            Step {currentStep} of {steps.length}
          </div>
        </div>
      </motion.div>
    )
  }

  if (state === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full px-2.5 py-3 rounded-md border border-[#10b981] bg-[#1a1a1a]"
      >
        <div className="flex items-center gap-2 text-[#10b981]">
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">Workspace created successfully!</span>
        </div>
      </motion.div>
    )
  }

  if (state === "error") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full px-2.5 py-3 rounded-md border border-[#ef4444] bg-[#1a1a1a]"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-[#ef4444]">
            <X className="w-4 h-4" />
            <span className="text-sm font-medium">Failed to create workspace</span>
          </div>
        </div>
        {errorMessage && <p className="text-xs text-[#9ca3af] mb-2">{errorMessage}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleRetry}
            className="flex-1 px-3 py-1.5 bg-[#ef4444] text-white text-xs font-medium rounded hover:bg-[#ef4444]/90 transition-colors"
          >
            Retry
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 px-3 py-1.5 bg-[#2a2a2a] text-white text-xs font-medium rounded hover:bg-[#333] transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    )
  }

  return null
}

function ProjectSection({ project }: { project: Project }) {
  const allWorkspaces = useWorkspaceStore((state) => state.workspaces)
  const workspaces = useMemo(() => allWorkspaces.filter((w) => w.projectId === project.id), [allWorkspaces, project.id])
  const selectedWorkspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId)
  const expandedProjects = useWorkspaceStore((state) => state.expandedProjects)
  const toggleProject = useWorkspaceStore((state) => state.toggleProject)

  const isExpanded = expandedProjects[project.id]

  return (
    <div className="mb-3">
      <button
        onClick={() => toggleProject(project.id)}
        className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-[#1a1a1a]/40 rounded-md transition-colors group"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={`w-3.5 h-3.5 text-[#6b7280] transition-transform ${isExpanded ? "rotate-90" : ""}`}
          />
          <Folder className="w-3.5 h-3.5 text-[#6b7280]" />
          <span className="text-xs font-semibold text-white">{project.name}</span>
          <span className="text-[10px] text-[#6b7280] font-mono">({workspaces.length})</span>
        </div>
      </button>

      {/* Workspaces List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-5 mt-1.5 space-y-1">
              {workspaces.map((workspace, index) => (
                <WorkspaceListItem
                  key={workspace.id}
                  workspace={workspace}
                  isSelected={workspace.id === selectedWorkspaceId}
                  index={index}
                />
              ))}

              {/* NewWorkspaceCard component */}
              <NewWorkspaceCard projectId={project.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ResizeHandle({
  direction,
  onResize,
}: {
  direction: "horizontal" | "vertical"
  onResize: (delta: number) => void
}) {
  const [isDragging, setIsDragging] = React.useState(false)

  React.useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = direction === "horizontal" ? e.movementX : e.movementY
      onResize(delta)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, direction, onResize])

  return (
    <div
      className={`${
        direction === "horizontal"
          ? "w-1 cursor-col-resize hover:bg-[#50fa7b]/20 active:bg-[#50fa7b]/40"
          : "h-1 cursor-row-resize hover:bg-[#50fa7b]/20 active:bg-[#50fa7b]/40"
      } ${isDragging ? "bg-[#50fa7b]/40" : "bg-transparent"} transition-colors flex-shrink-0`}
      onMouseDown={() => setIsDragging(true)}
    />
  )
}

export default function Dashboard() {
  const {
    projects,
    workspaces,
    selectedWorkspaceId,
    commandKeyPressed,
    setCommandKeyPressed,
    leftPanelWidth, // Added panel width state
    rightPanelWidth, // Added panel width state
    filesHeightPercent, // Added files height percent state
    setLeftPanelWidth, // Added panel width setter
    setRightPanelWidth, // Added panel width setter
    setFilesHeightPercent, // Added files height percent setter
  } = useWorkspaceStore()

  const selectedWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        setCommandKeyPressed(true)

        // Handle Command+N for new workspace
        if (e.key === "n" || e.key === "N") {
          e.preventDefault()
          console.log("[v0] Command+N pressed: Create new workspace")
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) {
        setCommandKeyPressed(false)
      }
    }

    const handleBlur = () => {
      setCommandKeyPressed(false)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("blur", handleBlur)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("blur", handleBlur)
    }
  }, [])

  const handleLeftResize = React.useCallback(
    (delta: number) => {
      setLeftPanelWidth(Math.max(200, Math.min(500, leftPanelWidth + delta)))
    },
    [leftPanelWidth, setLeftPanelWidth],
  )

  const handleRightResize = React.useCallback(
    (delta: number) => {
      setRightPanelWidth(Math.max(300, Math.min(600, rightPanelWidth - delta)))
    },
    [rightPanelWidth, setRightPanelWidth],
  )

  const handleFilesResize = React.useCallback(
    (delta: number) => {
      const containerHeight = window.innerHeight - 44 // Subtract nav height
      const deltaPercent = (delta / containerHeight) * 100
      setFilesHeightPercent(Math.max(20, Math.min(80, filesHeightPercent + deltaPercent)))
    },
    [filesHeightPercent, setFilesHeightPercent],
  )

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col">
      <nav className="h-11 border-b border-[#1a1a1a] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-[#50fa7b]" />
          <span className="font-bold text-white text-base tracking-tight">Napoleon</span>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className="border-r border-[#1a1a1a] p-3 overflow-y-auto flex-shrink-0"
          style={{ width: `${leftPanelWidth}px` }}
        >
          <h2 className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider mb-2 px-2">Projects</h2>
          <div className="space-y-0.5">
            {projects.map((project) => (
              <ProjectSection key={project.id} project={project} />
            ))}
          </div>
        </aside>

        <ResizeHandle direction="horizontal" onResize={handleLeftResize} />

        {/* Center: Chat View */}
        <main className="flex-1 p-4 overflow-hidden">
          <AnimatePresence mode="wait">
            {workspaces.length === 0 ? (
              <EmptyState />
            ) : selectedWorkspace ? (
              <ChatView workspace={selectedWorkspace} />
            ) : (
              <EmptyState />
            )}
          </AnimatePresence>
        </main>

        {/* Right Panel: Files Changed + Terminal Tabs */}
        {selectedWorkspace && (
          <>
            <ResizeHandle direction="horizontal" onResize={handleRightResize} />

            <aside
              className="border-l border-[#1a1a1a] flex flex-col overflow-hidden flex-shrink-0"
              style={{ width: `${rightPanelWidth}px` }}
            >
              {/* Files Changed */}
              <div
                className="border-b border-[#1a1a1a] p-3 overflow-hidden flex-shrink-0"
                style={{ height: `${filesHeightPercent}%` }}
              >
                <FileChangesList />
              </div>

              <ResizeHandle direction="vertical" onResize={handleFilesResize} />

              {/* Terminal Tabs */}
              <div className="flex flex-col overflow-hidden" style={{ height: `${100 - filesHeightPercent}%` }}>
                <TerminalTabs />
              </div>
            </aside>
          </>
        )}
      </div>

      {selectedWorkspace && <DiffViewerPanel workspace={selectedWorkspace} />}
    </div>
  )
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full text-center px-4"
    >
      <div className="bg-[#1a1a1a] rounded-full p-6 mb-4 border border-[#2a2a2a]">
        <Folder className="w-12 h-12 text-[#6b7280]" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">No active workspaces</h2>
      <p className="text-[#6b7280] text-sm mb-6 max-w-md">
        Create your first workspace to start parallel development with Claude Code AI agents
      </p>
      <button className="bg-[#50fa7b] text-black px-5 py-2.5 rounded-md text-sm font-medium hover:bg-[#50fa7b]/90 transition-colors flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Create Workspace
      </button>
    </motion.div>
  )
}

function ModelSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const selectedModel = useWorkspaceStore((state) => state.selectedModel)
  const setSelectedModel = useWorkspaceStore((state) => state.setSelectedModel)

  const models = [
    { id: "opus", name: "Opus", badge: null },
    { id: "sonnet-4.5", name: "Sonnet 4.5", badge: "NEW" },
  ]

  const currentModel = models.find((m) => m.id === selectedModel)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] text-white text-sm rounded-md hover:bg-[#252525] transition-colors border border-[#2a2a2a]"
      >
        <Activity className="w-3.5 h-3.5" />
        <span>{currentModel?.name}</span>
        {currentModel?.badge && (
          <span className="px-1.5 py-0.5 bg-[#50fa7b] text-black text-[9px] font-bold rounded">
            {currentModel.badge}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full mb-2 left-0 w-48 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] shadow-2xl overflow-hidden z-20"
            >
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model.id)
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[#252525] transition-colors text-left"
                >
                  <Activity className="w-3.5 h-3.5 text-[#9ca3af]" />
                  <span className="text-sm text-white">{model.name}</span>
                  {model.badge && (
                    <span className="px-1.5 py-0.5 bg-[#50fa7b] text-black text-[9px] font-bold rounded">
                      {model.badge}
                    </span>
                  )}
                  {selectedModel === model.id && <Check className="w-3.5 h-3.5 text-[#50fa7b] ml-auto" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function CollapsibleMessage({ message }: { message: ChatMessage }) {
  const [isExpanded, setIsExpanded] = useState(!message.collapsed)

  return (
    <div className="bg-[#151515] rounded-md border border-[#2a2a2a] overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#1a1a1a] transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={`w-3.5 h-3.5 text-[#9ca3af] transition-transform ${isExpanded ? "rotate-90" : ""}`}
          />
          <span className="text-sm text-[#9ca3af]">
            {message.toolCalls} tool calls, {message.messageCount} messages
          </span>
          <FileText className="w-3.5 h-3.5 text-[#9ca3af]" />
          <GitBranch className="w-3.5 h-3.5 text-[#9ca3af]" />
          <Check className="w-3.5 h-3.5 text-[#9ca3af]" />
        </div>
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[#2a2a2a]"
          >
            <div className="p-3 space-y-2">
              {/* Actions */}
              {message.actions?.map((action, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {action.type === "read" ? (
                    <FileText className="w-3.5 h-3.5 text-[#9ca3af]" />
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-white">+</span>
                      <span className="text-white font-medium">{action.type}</span>
                    </div>
                  )}
                  <span className="text-white">{action.label}</span>
                  {action.file && (
                    <span className="px-2 py-0.5 bg-[#3d2a1f] text-[#d4a574] text-xs font-mono rounded">
                      {action.file}
                    </span>
                  )}
                  {action.additions !== undefined && (
                    <span className="text-xs text-[#50fa7b] font-mono">+{action.additions}</span>
                  )}
                  {action.deletions !== undefined && (
                    <span className="text-xs text-[#ff5555] font-mono">-{action.deletions}</span>
                  )}
                </div>
              ))}

              {/* Nested collapsible for diff */}
              {message.diff && (
                <div className="mt-2">
                  <CollapsibleDiff diff={message.diff} />
                </div>
              )}

              {/* Main content */}
              <div className="mt-3">
                <p className="text-base text-white leading-relaxed">{message.content}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CollapsibleDiff({ diff }: { diff: MessageDiff }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border border-[#2a2a2a] rounded-md overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] hover:bg-[#252525] transition-colors"
      >
        <ChevronRight className={`w-3.5 h-3.5 text-[#9ca3af] transition-transform ${isExpanded ? "rotate-90" : ""}`} />
        <span className="text-sm text-white font-medium">Edit</span>
        <span className="px-2 py-0.5 bg-[#3d2a1f] text-[#d4a574] text-xs font-mono rounded">{diff.file}</span>
        <span className="text-xs text-[#50fa7b] font-mono">+{diff.additions}</span>
        <span className="text-xs text-[#ff5555] font-mono">-{diff.deletions}</span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[#2a2a2a] bg-[#0d0d0d]"
          >
            <div className="p-3 font-mono text-sm">
              {diff.content.split("\n").map((line, index) => {
                const isAddition = line.startsWith("+")
                const isDeletion = line.startsWith("-")
                const bgColor = isAddition ? "bg-[#0f4c2a]" : isDeletion ? "bg-[#4c0f0f]" : "bg-transparent"
                const textColor = isAddition ? "text-[#50fa7b]" : isDeletion ? "text-[#ff5555]" : "text-[#f8f8f2]"

                return (
                  <div key={index} className={`flex ${bgColor} px-2 py-0.5`}>
                    <span className="w-8 text-right text-[#6b7280] select-none mr-3">{index + 1}</span>
                    <span className={textColor}>{line}</span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
