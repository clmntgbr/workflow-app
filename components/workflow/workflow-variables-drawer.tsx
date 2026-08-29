"use client"

import { EmptyComponent } from "@/components/empty"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { CanvasStep, isNonHttpStep } from "@/components/workflow/step-node"
import { StepPreview } from "@/components/workflow/step-preview"
import { VariableDrawer } from "@/components/workflow/variable-drawer"
import {
  WorkflowVariable,
  WorkflowVariableKind,
} from "@/lib/workflow/variable/types"
import { Braces, ChevronDownIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"
import { Badge } from "../ui/badge"

interface WorkflowVariablesDrawerProps {
  workflowId: string
  variables: WorkflowVariable[]
  steps: CanvasStep[]
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onVariablesChange: (variables: WorkflowVariable[]) => void
  onRequestDelete?: (variable: WorkflowVariable) => void
}

function formatVariableBadge(variable: WorkflowVariable): string {
  if (variable.kind === "static") {
    if (variable.value === undefined || variable.value === null) return "static"
    if (typeof variable.value === "string") return variable.value
    try {
      return JSON.stringify(variable.value)
    } catch {
      return "static"
    }
  }
  return variable.path ?? "extracted"
}

export function WorkflowVariablesDrawer({
  workflowId,
  variables,
  steps,
  isOpen,
  onOpenChange,
  onVariablesChange,
  onRequestDelete,
}: WorkflowVariablesDrawerProps) {
  const [isVariableFormOpen, setIsVariableFormOpen] = useState(false)
  const [editingVariable, setEditingVariable] =
    useState<WorkflowVariable | null>(null)
  const [createStepId, setCreateStepId] = useState<string | null>(null)
  const [createKind, setCreateKind] =
    useState<WorkflowVariableKind>("extracted")
  const [stepSearch, setStepSearch] = useState("")

  const httpSteps = steps.filter((step) => !isNonHttpStep(step))

  const filteredSteps = (() => {
    const query = stepSearch.trim().toLowerCase()
    if (!query) return httpSteps
    return httpSteps.filter(
      (step) =>
        step.name.toLowerCase().includes(query) ||
        step.path.toLowerCase().includes(query)
    )
  })()

  const openCreateStatic = () => {
    setEditingVariable(null)
    setCreateStepId(null)
    setCreateKind("static")
    setIsVariableFormOpen(true)
  }

  const openCreateExtracted = (stepId: string) => {
    setEditingVariable(null)
    setCreateStepId(stepId)
    setCreateKind("extracted")
    setIsVariableFormOpen(true)
  }

  const openEdit = (variable: WorkflowVariable) => {
    setCreateStepId(variable.stepId)
    setCreateKind(variable.kind ?? (variable.stepId ? "extracted" : "static"))
    setEditingVariable(variable)
    setIsVariableFormOpen(true)
  }

  const handleSaved = (saved: WorkflowVariable) => {
    const exists = variables.some((variable) => variable.id === saved.id)
    onVariablesChange(
      exists
        ? variables.map((variable) =>
            variable.id === saved.id ? saved : variable
          )
        : [...variables, saved]
    )
  }

  const activeEditing =
    editingVariable &&
    variables.some((variable) => variable.id === editingVariable.id)
      ? editingVariable
      : null

  const formKind = activeEditing
    ? (activeEditing.kind ?? (activeEditing.stepId ? "extracted" : "static"))
    : createKind

  const formStepId = activeEditing?.stepId ?? createStepId

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
        <DrawerContent className="flex h-full w-[40vw]! max-w-[40vw]! flex-col">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Workflow Variables</DrawerTitle>
          </DrawerHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b px-6 py-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Braces className="size-4 text-muted-foreground" />
                    <h2 className="text-base font-semibold">
                      Workflow Variables
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Manage workflow variables
                  </p>
                </div>

                <DropdownMenu
                  onOpenChange={(open) => {
                    if (!open) setStepSearch("")
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      className="h-9 justify-between gap-2 bg-emerald-600 px-3 text-white hover:bg-emerald-700"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <PlusIcon className="size-4" />
                        Add Variable
                      </span>
                      <ChevronDownIcon className="size-4 shrink-0 opacity-80" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-80 p-0">
                    {httpSteps.length > 0 ? (
                      <>
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="hidden">
                            Extract from step
                          </DropdownMenuLabel>
                        </DropdownMenuGroup>
                        <div className="p-2">
                          <Input
                            value={stepSearch}
                            placeholder="Search by name or URL…"
                            className="h-8"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                            onChange={(event) =>
                              setStepSearch(event.target.value)
                            }
                          />
                        </div>
                        <DropdownMenuSeparator className="my-0" />
                      </>
                    ) : null}
                    <div className="max-h-56 overflow-y-auto">
                      <DropdownMenuItem
                        className="h-14 items-center rounded-none border-b border-slate-200 last:border-b-0"
                        onClick={openCreateStatic}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-700 uppercase">
                            Static
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-foreground">
                              Static variable
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              Constant available from workflow start
                            </p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                      {filteredSteps.map((step) => (
                        <DropdownMenuItem
                          key={step.id}
                          className="h-14 items-center rounded-none border-b border-slate-200 last:border-b-0"
                          onClick={() => openCreateExtracted(step.id)}
                        >
                          <StepPreview
                            name={step.name}
                            method={step.method}
                            url={step.path}
                          />
                        </DropdownMenuItem>
                      ))}
                      {httpSteps.length > 0 && filteredSteps.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                          No steps found
                        </p>
                      ) : null}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
              {variables.length === 0 ? (
                <EmptyComponent
                  title="No variables yet"
                  description="Add a static constant or extract a value from a step response to reuse later with {{key}}."
                  icon={<Braces className="size-5 text-muted-foreground" />}
                />
              ) : (
                <ul className="space-y-2">
                  {variables.map((variable) => (
                    <li key={variable.id} className="flex items-stretch gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto min-w-0 flex-1 justify-start gap-4 px-2 py-2 text-left font-normal whitespace-normal"
                        onClick={() => openEdit(variable)}
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md border">
                          <Braces className="size-3.5 shrink-0" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold">
                            {variable.key}
                          </span>
                          <span className="block truncate text-muted-foreground">
                            {variable.name}
                          </span>
                        </span>
                        <span className="flex max-w-[40%] shrink-0 flex-col items-end gap-1 px-1.5 py-0.5">
                          <Badge
                            variant="secondary"
                            className="max-w-full truncate"
                          >
                            {formatVariableBadge(variable)}
                          </Badge>
                        </span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 self-center text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete ${variable.name}`}
                        onClick={() => onRequestDelete?.(variable)}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </DrawerContent>

        <VariableDrawer
          workflowId={workflowId}
          stepId={formStepId}
          kind={formKind}
          variable={activeEditing}
          isOpen={
            isVariableFormOpen &&
            (editingVariable === null || Boolean(activeEditing))
          }
          nested
          onOpenChange={(open) => {
            setIsVariableFormOpen(open)
            if (!open) {
              setEditingVariable(null)
              setCreateStepId(null)
              setCreateKind("extracted")
            }
          }}
          onSaved={handleSaved}
          onRequestDelete={onRequestDelete}
        />
      </Drawer>
    </>
  )
}
