export function Field({ label, children, required, error }: {
  label: string; children: React.ReactNode; required?: boolean; error?: string
}) {
  return (
    <div className="field">
      <label className="field-label">
        {label}{required && <span className="field-required"> *</span>}
      </label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
