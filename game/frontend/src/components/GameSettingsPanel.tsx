/**
 * GameSettingsPanel — shared settings UI used in both the multiplayer lobby
 * (pre-game configuration) and the solo-player lobby screen.
 *
 * Adding a new setting here automatically exposes it in both contexts.
 */

export type GameSettings = {
  duration: 15 | 30 | 45 | 60
  movingButton: boolean
  moveSpeed: number  // pixels per second, range 50–500, default 150
  buttonSize: 'tiny' | 'small' | 'normal' | 'large'
  ghostMode: boolean
  shrinkMode: boolean
  gravityMode: boolean
  hotZone: boolean
  bombMode: boolean
}

export function defaultSettings(): GameSettings {
  return {
    duration: 30,
    movingButton: false,
    moveSpeed: 150,
    buttonSize: 'normal',
    ghostMode: false,
    shrinkMode: false,
    gravityMode: false,
    hotZone: false,
    bombMode: false,
  }
}

export function settingsSummary(s: GameSettings): string {
  const parts: string[] = [`${s.duration}s`]
  if (s.movingButton) parts.push('Moving')
  if (s.ghostMode) parts.push('Ghost')
  if (s.shrinkMode) parts.push('Shrink')
  if (s.gravityMode) parts.push('Gravity')
  if (s.hotZone) parts.push('Hot Zone')
  if (s.bombMode) parts.push('Bombs')
  if (s.buttonSize !== 'normal') parts.push(s.buttonSize.charAt(0).toUpperCase() + s.buttonSize.slice(1) + ' btn')
  return parts.join(' · ')
}

interface GameSettingsPanelProps {
  settings: GameSettings
  onChange: (settings: GameSettings) => void
}

export function GameSettingsPanel({ settings, onChange }: GameSettingsPanelProps) {
  const patch = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <>
      <div className="settings-row">
        <span className="settings-label">Duration</span>
        <div className="seg-control">
          {([15, 30, 45, 60] as const).map(d => (
            <button
              key={d}
              className={`seg-btn${settings.duration === d ? ' seg-btn-active' : ''}`}
              onClick={() => patch('duration', d)}
            >{d}s</button>
          ))}
        </div>
      </div>

      <div className="settings-row">
        <span className="settings-label">Button size</span>
        <div className="seg-control">
          {(['tiny', 'small', 'normal', 'large'] as const).map(s => (
            <button
              key={s}
              className={`seg-btn${settings.buttonSize === s ? ' seg-btn-active' : ''}`}
              onClick={() => patch('buttonSize', s)}
            >{s}</button>
          ))}
        </div>
      </div>

      <div className="settings-row">
        <label className="settings-toggle">
          <span className="settings-label">Moving button</span>
          <input
            type="checkbox"
            checked={settings.movingButton}
            disabled={settings.gravityMode}
            onChange={e => patch('movingButton', e.target.checked)}
          />
        </label>
      </div>

      {settings.movingButton && (
        <div className="settings-row settings-indent">
          <span className="settings-label">Speed <span className="settings-value">{settings.moveSpeed} px/s</span></span>
          <input
            type="range"
            min={50}
            max={500}
            step={10}
            value={settings.moveSpeed}
            onChange={e => patch('moveSpeed', Number(e.target.value))}
            className="settings-slider"
          />
        </div>
      )}

      <div className="settings-row">
        <label className="settings-toggle">
          <span className="settings-label">Gravity mode</span>
          <input
            type="checkbox"
            checked={settings.gravityMode}
            disabled={settings.movingButton}
            onChange={e => patch('gravityMode', e.target.checked)}
          />
        </label>
      </div>

      <div className="settings-row">
        <label className="settings-toggle">
          <span className="settings-label">Ghost mode</span>
          <input
            type="checkbox"
            checked={settings.ghostMode}
            onChange={e => patch('ghostMode', e.target.checked)}
          />
        </label>
      </div>

      <div className="settings-row">
        <label className="settings-toggle">
          <span className="settings-label">Shrink mode</span>
          <input
            type="checkbox"
            checked={settings.shrinkMode}
            onChange={e => patch('shrinkMode', e.target.checked)}
          />
        </label>
      </div>

      <div className="settings-row">
        <label className="settings-toggle">
          <span className="settings-label">Hot zone</span>
          <input
            type="checkbox"
            checked={settings.hotZone}
            onChange={e => patch('hotZone', e.target.checked)}
          />
        </label>
      </div>

      <div className="settings-row">
        <label className="settings-toggle">
          <span className="settings-label">Bomb mode</span>
          <input
            type="checkbox"
            checked={settings.bombMode}
            onChange={e => patch('bombMode', e.target.checked)}
          />
        </label>
      </div>
    </>
  )
}
