import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTema } from '@/theme';

/**
 * Íconos de línea para la navegación y los botones (como en el prototipo).
 * Los emojis 3D siguen siendo para el contenido (categorías, consejos, metas); estos son solo controles.
 */
export type NombreIcono =
  | 'casa'
  | 'grafica'
  | 'moneda'
  | 'mas'
  | 'ajustes'
  | 'luna'
  | 'sol'
  | 'cartera'
  | 'cuadricula'
  | 'abajo'
  | 'atras'
  | 'adelante'
  | 'buscar'
  | 'cerrar'
  | 'calendario'
  | 'codigoBarras';

export function Icono({ nombre, tamano = 22, color, grosor = 2 }: { nombre: NombreIcono; tamano?: number; color?: string; grosor?: number }) {
  const { colores } = useTema();
  const trazo = color ?? colores.texto;
  const p = { stroke: trazo, strokeWidth: grosor, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24" accessible={false}>
      {nombre === 'casa' && (
        <>
          <Path d="M3 10.5 12 3l9 7.5" {...p} />
          <Path d="M5 9.5V21h14V9.5" {...p} />
          <Path d="M9.5 21v-6h5v6" {...p} />
        </>
      )}
      {nombre === 'grafica' && (
        <>
          <Path d="M3 21h18" {...p} />
          <Path d="M7 17v-5M12 17V7M17 17v-8" {...p} />
        </>
      )}
      {nombre === 'moneda' && (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M14.5 9.5c-.4-1-1.4-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.1 0-2.1-.5-2.5-1.5M12 6.5V8M12 16v1.5" {...p} />
        </>
      )}
      {nombre === 'mas' && <Path d="M12 5v14M5 12h14" {...p} />}
      {nombre === 'codigoBarras' && (
        <>
          {/* Marco de escáner con barras: abre la cámara para leer el código. */}
          <Path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" {...p} />
          <Path d="M7 8v8M10 8v8M13 8v8M17 8v8" {...p} />
          <Path d="M15 8v8" {...p} strokeWidth={grosor * 0.6} />
        </>
      )}
      {nombre === 'ajustes' && (
        <>
          <Path d="M4 7h9M19 7h1M4 17h3M13 17h7" {...p} />
          <Circle cx={16} cy={7} r={2.5} {...p} />
          <Circle cx={10} cy={17} r={2.5} {...p} />
        </>
      )}
      {nombre === 'luna' && <Path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" {...p} />}
      {nombre === 'sol' && (
        <>
          <Circle cx={12} cy={12} r={4} {...p} />
          <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...p} />
        </>
      )}
      {nombre === 'cartera' && (
        <>
          <Path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18v4" {...p} />
          <Path d="M3 7.5V18a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9H5.5A2.5 2.5 0 0 1 3 7.5z" {...p} />
          <Circle cx={16.5} cy={14.5} r={1} fill={trazo} />
        </>
      )}
      {nombre === 'cuadricula' && (
        <>
          <Rect x={4} y={4} width={6.5} height={6.5} rx={1.5} {...p} />
          <Rect x={13.5} y={4} width={6.5} height={6.5} rx={1.5} {...p} />
          <Rect x={4} y={13.5} width={6.5} height={6.5} rx={1.5} {...p} />
          <Rect x={13.5} y={13.5} width={6.5} height={6.5} rx={1.5} {...p} />
        </>
      )}
      {nombre === 'abajo' && <Path d="m6 9 6 6 6-6" {...p} />}
      {nombre === 'atras' && <Path d="m15 18-6-6 6-6" {...p} />}
      {nombre === 'adelante' && <Path d="m9 18 6-6-6-6" {...p} />}
      {nombre === 'buscar' && (
        <>
          <Circle cx={11} cy={11} r={7} {...p} />
          <Path d="m20 20-3.5-3.5" {...p} />
        </>
      )}
      {nombre === 'cerrar' && <Path d="M6 6l12 12M18 6 6 18" {...p} />}
      {nombre === 'calendario' && (
        <>
          <Rect x={3.5} y={5} width={17} height={15.5} rx={2.5} {...p} />
          <Path d="M3.5 10h17M8 3v4M16 3v4" {...p} />
        </>
      )}
    </Svg>
  );
}
