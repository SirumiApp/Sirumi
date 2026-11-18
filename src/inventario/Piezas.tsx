import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, TextInput, View } from "react-native";

import { Emoji } from "@/components/emoji/Emoji";
import type { NombreEmoji } from "@/components/emoji/registro";
import { Texto } from "@/components/Texto";
import { ALTO_TOCABLE, ESPACIO, FUENTES, useTema } from "@/theme";

/** Íconos para productos (emojis 3D de la marca). */
export const EMOJIS_PRODUCTO: NombreEmoji[] = [
  "paquete",
  "camiseta",
  "vestido",
  "jeans",
  "bolso",
  "bolsas-de-compras",
  "cafe",
  "galleta",
  "torta",
  "hamburguesa",
  "regalo",
  "planta",
  "gota",
  "etiqueta",
  "diamante",
  "libros",
];

export const TALLAS = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "6",
  "8",
  "10",
  "12",
  "14",
  "16",
  "34",
  "36",
  "38",
  "40",
];

/** Fila deslizable para escoger el ícono del producto. */
export function SelectorEmoji({
  valor,
  onCambio,
}: {
  valor: string;
  onCambio: (e: NombreEmoji) => void;
}) {
  const { t } = useTranslation();
  const { colores } = useTema();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, marginHorizontal: -ESPACIO.m }}
      contentContainerStyle={{ gap: ESPACIO.s, paddingHorizontal: ESPACIO.m }}
      accessibilityRole="radiogroup"
      accessibilityLabel={t("inventario.producto.emoji")}
    >
      {EMOJIS_PRODUCTO.map((e) => (
        <Pressable
          key={e}
          accessibilityRole="radio"
          accessibilityState={{ selected: valor === e }}
          accessibilityLabel={e}
          onPress={() => onCambio(e)}
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: valor === e ? colores.accion : "transparent",
            backgroundColor:
              valor === e ? colores.seleccionado : colores.relleno,
          }}
        >
          <Emoji name={e} size={30} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

/** − cantidad + (la cantidad también se puede escribir). */
export function CampoCantidad({
  valor,
  onCambio,
  etiqueta,
  deshabilitado,
  soloBotones,
}: {
  valor: number;
  onCambio: (v: number) => void;
  etiqueta: string;
  deshabilitado?: boolean;
  /** Sin campo escribible (cada toque es un movimiento de inventario). */
  soloBotones?: boolean;
}) {
  const { colores } = useTema();
  const boton = (signo: "−" | "+", delta: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${signo} ${etiqueta}`}
      disabled={deshabilitado || (delta < 0 && valor <= 0)}
      onPress={() => onCambio(Math.max(0, valor + delta))}
      style={({ pressed }) => ({
        width: ALTO_TOCABLE,
        height: ALTO_TOCABLE,
        borderRadius: ALTO_TOCABLE / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colores.relleno,
        opacity:
          deshabilitado || (delta < 0 && valor <= 0) ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Texto
        style={{ fontFamily: FUENTES.titulo, fontSize: 20, lineHeight: 24 }}
      >
        {signo}
      </Texto>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {boton("−", -1)}
      {soloBotones ? (
        <Texto
          accessibilityLabel={`${etiqueta}: ${valor}`}
          style={{
            width: 52,
            textAlign: "center",
            fontFamily: FUENTES.titulo,
            fontSize: 18,
            lineHeight: 24,
          }}
        >
          {valor}
        </Texto>
      ) : (
        <TextInput
          accessibilityLabel={etiqueta}
          editable={!deshabilitado}
          keyboardType="number-pad"
          value={String(valor)}
          onChangeText={(v) =>
            onCambio(Math.min(99999, parseInt(v.replace(/\D/g, "") || "0", 10)))
          }
          style={{
            width: 52,
            textAlign: "center",
            fontFamily: FUENTES.titulo,
            fontSize: 18,
            color: colores.texto,
          }}
        />
      )}
      {boton("+", 1)}
    </View>
  );
}
