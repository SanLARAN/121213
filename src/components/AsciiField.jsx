import { useEffect, useRef } from 'react'

/**
 * Анимированная ASCII-полутоновая графика (dither halftone).
 * Яркость поля считается из наложенных волн, затем упорядоченно
 * дизерится матрицей Байера и переводится в символы — как на постерах.
 */

const RAMP = ' ·:+*KK#'
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => v / 16 - 0.5))

function frame(cols, rows, t) {
  let out = ''
  for (let y = 0; y < rows; y++) {
    const v = (y / (rows - 1)) * 2 - 1
    for (let x = 0; x < cols; x++) {
      const u = (x / (cols - 1)) * 2 - 1

      const rot = u * Math.cos(t * 0.25) + v * Math.sin(t * 0.25)
      const wave =
        0.5 * Math.sin(3.4 * rot + t * 0.9) +
        0.4 * Math.sin(5.1 * v - t * 0.6) +
        0.35 * Math.sin(7.0 * (u * v) + t * 0.5)

      const breathe = 0.06 * Math.sin(t * 0.4)
      const r = Math.sqrt(u * u * 0.8 + v * v * 1.35)
      const glow = 1.18 - r * (1.02 - breathe)

      let b = glow * 0.82 + wave * 0.24
      b += BAYER[y % 4][x % 4] * 0.32
      b = b < 0 ? 0 : b > 1 ? 1 : b

      out += RAMP[Math.round(b * (RAMP.length - 1))]
    }
    if (y < rows - 1) out += '\n'
  }
  return out
}

export default function AsciiField({
  cols = 60,
  rows = 18,
  animate = true,
  fps = 14,
  className = '',
}) {
  const ref = useRef(null)

  // подгоняем кегль под ширину контейнера
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      const w = el.parentElement?.clientWidth ?? 320
      el.style.fontSize = `${Math.max(4, Math.min(13, w / (cols * 0.62)))}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    if (el.parentElement) ro.observe(el.parentElement)
    return () => ro.disconnect()
  }, [cols])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!animate || reduce) {
      el.textContent = frame(cols, rows, 1.4)
      return
    }

    let raf = 0
    let last = 0
    const start = performance.now()
    const step = (now) => {
      raf = requestAnimationFrame(step)
      if (now - last < 1000 / fps) return
      last = now
      el.textContent = frame(cols, rows, (now - start) / 1000)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [cols, rows, animate, fps])

  return <pre ref={ref} className={`ascii ${className}`} aria-hidden="true" />
}
