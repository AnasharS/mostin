import type { Field } from "@/lib/cms/resources"
import { label as tagLabel } from "@/lib/ai/taxonomy"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { FileUpload } from "./file-upload"

type Area = { id: number; name: string }

const selectClass =
  "h-9 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"

function toText(field: Field, value: unknown) {
  if (value === null || value === undefined) return ""
  if (field.type === "tags" && Array.isArray(value)) return value.join(", ")
  if (typeof value === "object") return JSON.stringify(value, null, 2)
  return String(value)
}

export function FieldInput({ field, value, areas }: { field: Field; value: unknown; areas: Area[] }) {
  const id = field.name
  const describedBy = field.help ? `${id}-help` : undefined
  const common = { id, name: field.name, required: field.required, "aria-describedby": describedBy }

  let control: React.ReactNode
  switch (field.type) {
    case "textarea":
      control = <Textarea {...common} rows={field.name === "description" ? 8 : 4} defaultValue={toText(field, value)} />
      break
    case "boolean":
      return (
        <div className="flex items-start gap-2">
          <input type="checkbox" id={id} name={field.name} defaultChecked={Boolean(value)} className="mt-1 size-4" aria-describedby={describedBy} />
          <div>
            <Label htmlFor={id}>{field.label}</Label>
            {field.help && <p id={`${id}-help`} className="text-xs text-muted-foreground">{field.help}</p>}
          </div>
        </div>
      )
    case "select":
      control = (
        <select {...common} defaultValue={toText(field, value)} className={selectClass}>
          <option value="">- wybierz -</option>
          {field.options?.map((o) => <option key={o} value={o}>{tagLabel(o)}</option>)}
        </select>
      )
      break
    case "area":
      control = (
        <select {...common} defaultValue={toText(field, value)} className={selectClass}>
          <option value="">- brak -</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      )
      break
    case "multiselect":
    case "areas": {
      const selected = new Set((Array.isArray(value) ? value : []).map(String))
      const opts = field.type === "areas"
        ? areas.map((a) => ({ value: String(a.id), text: a.name }))
        : (field.options ?? []).map((o) => ({ value: o, text: tagLabel(o) }))
      return (
        <fieldset aria-describedby={describedBy}>
          <legend className="mb-2 text-sm font-medium">
            {field.label} {field.aiFilled && <AiHint />}
          </legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {opts.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={field.name} value={o.value} defaultChecked={selected.has(o.value)} className="size-4" />
                {o.text}
              </label>
            ))}
          </div>
          {field.help && <p id={`${id}-help`} className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
        </fieldset>
      )
    }
    case "file":
      control = <FileUpload name={field.name} bucket={field.bucket!} accept={field.accept} defaultValue={value as string | null} label={field.label} />
      break
    default:
      control = (
        <Input
          {...common}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "url" ? "url" : "text"}
          defaultValue={toText(field, value)}
        />
      )
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {field.label} {field.required && <span aria-hidden="true">*</span>} {field.aiFilled && <AiHint />}
      </Label>
      {control}
      {field.help && <p id={`${id}-help`} className="text-xs text-muted-foreground">{field.help}</p>}
    </div>
  )
}

function AiHint() {
  return <span className="ml-1 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-violet-900 dark:bg-violet-950 dark:text-violet-100">uzupełnia AI</span>
}
