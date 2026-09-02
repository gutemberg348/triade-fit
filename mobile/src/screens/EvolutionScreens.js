import { Fragment, useCallback, useMemo, useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  CirclePlus,
  ClipboardList,
  Droplets,
  Dumbbell,
  ImagePlus,
  Clock3,
  Medal,
  Ruler,
  Scale,
  Target,
  Trophy,
  TrendingUp,
  X,
} from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Stop, Text as SvgText } from "react-native-svg";
import api, { messageFrom } from "../services/api.js";
import { Button, Empty, ErrorBox, Loading, Screen } from "../components/UI.js";
import { colors, fonts, radii } from "../theme/index.js";

const options = [
  { key: "weightKg", label: "Peso", short: "Peso", unit: "kg", Icon: Scale },
  { key: "waistCm", label: "Cintura", short: "Cintura", unit: "cm", Icon: Ruler },
  { key: "hipsCm", label: "Quadril", short: "Quadril", unit: "cm", Icon: Ruler },
  { key: "bodyFatPercent", label: "Gordura", short: "Gordura", unit: "%", Icon: Droplets },
];

const measurementGroups = [
  {
    title: "Dados principais",
    description: "Use a mesma balança e, se possível, o mesmo horário.",
    fields: [["weightKg", "Peso", "kg"], ["heightCm", "Altura", "cm"], ["bodyFatPercent", "Gordura", "%"]],
  },
  {
    title: "Circunferências",
    description: "Registre apenas o que fizer sentido para seu acompanhamento.",
    fields: [["waistCm", "Cintura", "cm"], ["abdomenCm", "Abdômen", "cm"], ["hipsCm", "Quadril", "cm"], ["chestCm", "Peitoral", "cm"]],
  },
  {
    title: "Membros",
    description: "Medidas opcionais para uma leitura mais completa.",
    fields: [["rightArmCm", "Braço dir.", "cm"], ["leftArmCm", "Braço esq.", "cm"], ["rightThighCm", "Coxa dir.", "cm"], ["leftThighCm", "Coxa esq.", "cm"], ["rightCalfCm", "Panturrilha dir.", "cm"], ["leftCalfCm", "Panturrilha esq.", "cm"]],
  },
];
const measurementFieldKeys = measurementGroups.flatMap((group) =>
  group.fields.map(([key]) => key),
);

const quickMeasurementFields = [
  ["weightKg", "Peso", "kg"],
  ["waistCm", "Cintura", "cm"],
  ["hipsCm", "Quadril", "cm"],
  ["bodyFatPercent", "Gordura", "%"],
];

const initialMeasurementFields = [
  ["weightKg", "Peso *", "kg"],
  ["heightCm", "Altura *", "cm"],
  ["bodyFatPercent", "Gordura (opcional)", "%"],
];

const photoPoses = [
  { key: "FRONT", label: "Frente", hint: "Corpo de frente" },
  { key: "SIDE", label: "Lado", hint: "Perfil lateral" },
  { key: "BACK", label: "Costas", hint: "Corpo de costas" },
];

const additionalMeasurementGroups = [
  {
    title: "Outras medidas",
    description: "Opcional: adicione apenas o que quiser acompanhar.",
    fields: [["heightCm", "Altura", "cm"], ["abdomenCm", "Abdômen", "cm"], ["chestCm", "Peitoral", "cm"]],
  },
  measurementGroups[2],
];

const dateAtNoon = (value) => {
  const raw = String(value || "");
  return /^\d{4}-\d{2}-\d{2}/.test(raw) ? new Date(`${raw.slice(0, 10)}T12:00:00`) : new Date(value);
};
const localDateKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const formatDate = (value, style = { day: "2-digit", month: "short" }) =>
  new Intl.DateTimeFormat("pt-BR", style).format(dateAtNoon(value));
const formatNumber = (value) =>
  new Intl.NumberFormat("pt-BR").format(Number(value || 0));

const groupPhotoSets = (photos = []) => {
  const groups = new Map();
  photos.forEach((photo) => {
    const key = String(photo.takenAt).slice(0, 10);
    if (!groups.has(key)) groups.set(key, { key, photos: {} });
    if (!groups.get(key).photos[photo.pose]) groups.get(key).photos[photo.pose] = photo;
  });
  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
};

const photoSetLabel = (key, long = false) =>
  new Intl.DateTimeFormat("pt-BR", long
    ? { day: "2-digit", month: "long", year: "numeric" }
    : { day: "2-digit", month: "short" })
    .format(new Date(`${key}T12:00:00`));

function PhotoSlot({ photo, label, emptyLabel }) {
  return (
    <View style={styles.comparisonSlot}>
      {photo ? (
        <Image source={{ uri: photo.photoUrl }} style={styles.comparisonImage} resizeMode="cover" />
      ) : (
        <View style={styles.comparisonMissing}>
          <Camera size={21} color={colors.subtle} />
          <Text style={styles.comparisonMissingText}>{emptyLabel}</Text>
        </View>
      )}
      <View style={styles.comparisonSlotLabel}><Text style={styles.comparisonSlotLabelText}>{label}</Text></View>
    </View>
  );
}

function PhotoComparison({ photos, onAdd }) {
  const sets = useMemo(() => groupPhotoSets(photos), [photos]);
  const latest = sets[0];
  const defaultPrevious = sets.find((item) => item.key.slice(0, 7) !== latest?.key.slice(0, 7)) || sets[1];
  const [selectedKey, setSelectedKey] = useState(null);
  const previous = sets.find((item) => item.key === selectedKey) || defaultPrevious;

  if (!latest) {
    return (
      <Pressable style={styles.photoEmpty} onPress={onAdd}>
        <View style={styles.photoEmptyIcon}><Camera color={colors.primaryLight} size={22} /></View>
        <View style={{ flex: 1 }}><Text style={styles.photoEmptyTitle}>Crie seu primeiro registro visual</Text><Text style={styles.photoEmptyText}>Adicione frente, lado e costas em poucos passos.</Text></View>
        <ChevronRight size={20} color={colors.subtle} />
      </Pressable>
    );
  }

  return (
    <View style={styles.comparisonCard}>
      <View style={styles.comparisonTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.comparisonEyebrow}>ANTES E AGORA</Text>
          <Text style={styles.comparisonTitle}>{previous ? "Compare sua evolução" : "Seu registro mais recente"}</Text>
          <Text style={styles.comparisonSubtitle}>{previous ? `${photoSetLabel(previous.key, true)} × ${photoSetLabel(latest.key, true)}` : "Adicione um novo registro no próximo mês para comparar."}</Text>
        </View>
        <Pressable style={styles.comparisonAdd} onPress={onAdd}><ImagePlus size={17} color={colors.ink} /></Pressable>
      </View>

      {sets.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.comparisonPeriods}>
          {sets.slice(1).map((set) => {
            const active = set.key === previous?.key;
            return <Pressable key={set.key} onPress={() => setSelectedKey(set.key)} style={[styles.comparisonPeriod, active && styles.comparisonPeriodActive]}><Text style={[styles.comparisonPeriodText, active && styles.comparisonPeriodTextActive]}>{photoSetLabel(set.key)}</Text></Pressable>;
          })}
        </ScrollView>
      )}

      <View style={styles.comparisonColumnsHead}>
        <Text style={styles.comparisonColumnLabel}>{previous ? photoSetLabel(previous.key) : "Anterior"}</Text>
        <Text style={[styles.comparisonColumnLabel, styles.comparisonColumnNow]}>Agora · {photoSetLabel(latest.key)}</Text>
      </View>
      {photoPoses.map((pose) => (
        <View style={styles.comparisonPose} key={pose.key}>
          <Text style={styles.comparisonPoseLabel}>{pose.label.toUpperCase()}</Text>
          <View style={styles.comparisonPair}>
            <PhotoSlot photo={previous?.photos[pose.key]} label="Antes" emptyLabel="Sem foto" />
            <PhotoSlot photo={latest.photos[pose.key]} label="Agora" emptyLabel="Adicionar" />
          </View>
        </View>
      ))}
    </View>
  );
}

function TrendChart({ data, field, unit }) {
  const pointsData = data
    .filter((item) => item[field] != null)
    .map((item) => ({ value: Number(item[field]), date: item.measuredAt }));

  if (pointsData.length < 2) {
    return (
      <View style={styles.chartEmpty}>
        <TrendingUp color={colors.primaryLight} size={27} />
        <Text style={styles.chartEmptyTitle}>Seu gráfico começa com duas avaliações</Text>
        <Text style={styles.chartEmptyText}>Registre uma nova medida para comparar sua evolução.</Text>
      </View>
    );
  }

  const width = 360;
  const height = 202;
  const top = 18;
  const bottom = 35;
  const left = 39;
  const right = 13;
  const rawMin = Math.min(...pointsData.map((item) => item.value));
  const rawMax = Math.max(...pointsData.map((item) => item.value));
  const padding = Math.max((rawMax - rawMin) * 0.16, rawMax * 0.025, 0.5);
  const min = rawMin - padding;
  const max = rawMax + padding;
  const range = max - min || 1;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const points = pointsData.map((item, index) => ({
    ...item,
    x: left + index * (chartWidth / (pointsData.length - 1)),
    y: top + ((max - item.value) / range) * chartHeight,
  }));
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const area = `${line} L${points.at(-1).x},${top + chartHeight} L${points[0].x},${top + chartHeight} Z`;
  const guides = [0, 0.5, 1];

  return (
    <View style={styles.chartWrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <SvgGradient id="evolution-area" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.42" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        {guides.map((guide) => {
          const y = top + guide * chartHeight;
          const label = (max - guide * range).toFixed(guide === 0 || guide === 1 ? 1 : 0);
          return (
            <Fragment key={guide}>
              <Line x1={left} y1={y} x2={width - right} y2={y} stroke={colors.line} strokeWidth="1" strokeDasharray="4 5" />
              <SvgText x={left - 7} y={y + 4} fill={colors.subtle} fontSize="9" textAnchor="end">{label}</SvgText>
            </Fragment>
          );
        })}
        <Path d={area} fill="url(#evolution-area)" />
        <Path d={line} fill="none" stroke={colors.primaryLight} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <Circle key={point.date} cx={point.x} cy={point.y} r={index === points.length - 1 ? 5.5 : 4} fill={index === points.length - 1 ? colors.accent : colors.primaryLight} stroke={colors.surface} strokeWidth="3" />
        ))}
        {points.map((point, index) => (
          <SvgText key={`${point.date}-label`} x={point.x} y={height - 10} fill={colors.subtle} fontSize="9" textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}>
            {formatDate(point.date)}
          </SvgText>
        ))}
      </Svg>
      <Text style={styles.chartUnit}>Valores em {unit}</Text>
    </View>
  );
}

function InputField({ label, unit, value, onChangeText }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldControl}>
        <TextInput
          style={styles.fieldInput}
          keyboardType="decimal-pad"
          value={value}
          onChangeText={(text) => onChangeText(text.replace(",", "."))}
          placeholder="—"
          placeholderTextColor={colors.subtle}
        />
        <Text style={styles.fieldUnit}>{unit}</Text>
      </View>
    </View>
  );
}

function WeeklyActivity({ data = [] }) {
  const max = Math.max(...data.map((item) => item.minutes), 1);
  return (
    <View style={styles.weeklyCard}>
      <View style={styles.weeklyHeader}>
        <View>
          <Text style={styles.weeklyEyebrow}>ÚLTIMOS 7 DIAS</Text>
          <Text style={styles.weeklyTitle}>Ritmo da semana</Text>
        </View>
        <TrendingUp size={20} color={colors.primaryLight} />
      </View>
      <View style={styles.weekBars}>
        {data.map((item) => (
          <View style={styles.weekDay} key={item.date}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { height: `${Math.max(8, (item.minutes / max) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.weekValue}>{item.minutes || "—"}</Text>
            <Text style={styles.weekLabel}>
              {new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
                .format(new Date(`${item.date}T12:00:00`))
                .replace(".", "")}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.weekCaption}>Minutos concluídos por dia</Text>
    </View>
  );
}

export function EvolutionScreen({ navigation }) {
  const [state, setState] = useState({ loading: true, error: "", evolution: null, photos: [] });
  const [selected, setSelected] = useState(options[0]);
  const load = useCallback(async () => {
    try {
      const [evolution, photos] = await Promise.all([api.get("/measurements/evolution"), api.get("/progress-photos")]);
      setState({ loading: false, error: "", evolution: evolution.data, photos: photos.data });
    } catch (error) {
      setState((old) => ({ ...old, loading: false, error: messageFrom(error) }));
    }
  }, []);
  useFocusEffect(useCallback(() => void load(), [load]));

  if (state.loading) return <Screen><Loading label="Atualizando seus indicadores..." /></Screen>;
  if (state.error && !state.evolution) return <Screen><ErrorBox message={state.error} retry={load} /></Screen>;

  if (!state.evolution.measurements?.length) {
    return (
      <Screen>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>ACOMPANHAMENTO</Text>
          <Text style={styles.title}>Meu progresso</Text>
          <Text style={styles.lead}>Para acompanhar sua evolução, precisamos primeiro registrar seu ponto de partida.</Text>
        </View>
        <View style={styles.initialMeasurementCard}>
          <View style={styles.initialMeasurementIcon}><ClipboardList size={29} color={colors.text} /></View>
          <Text style={styles.initialMeasurementEyebrow}>PRIMEIRO PASSO</Text>
          <Text style={styles.initialMeasurementTitle}>Cadastre suas medidas iniciais</Text>
          <Text style={styles.initialMeasurementText}>Informe peso e altura para criar sua base. O percentual de gordura é opcional e pode ser adicionado agora ou depois.</Text>
          <View style={styles.initialMeasurementBenefits}>
            {["Peso e altura formam sua base", "Gordura corporal é opcional", "Fotos podem ser comparadas por período"].map((label) => (
              <View style={styles.initialMeasurementBenefit} key={label}><View style={styles.initialMeasurementDot} /><Text style={styles.initialMeasurementBenefitText}>{label}</Text></View>
            ))}
          </View>
          <View style={styles.initialMeasurementActions}>
            <Button title="Adicionar agora" icon={CirclePlus} onPress={() => navigation.navigate("AddMeasurement", { initial: true })} />
            <Pressable style={styles.skipMeasurement} onPress={() => navigation.navigate("Início")}>
              <Text style={styles.skipMeasurementText}>Agora não</Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  const comparison = state.evolution.comparison[selected.key];
  const activity = state.evolution.activity || {
    workouts: 0,
    minutes: 0,
    activeDays: 0,
    daily: [],
    achievements: [],
  };
  const totals = state.evolution.totals || {
    workouts: 0,
    sessions: 0,
    minutes: 0,
    activeDays: 0,
  };
  const decreaseIsPositive = ["weightKg", "waistCm", "bodyFatPercent"].includes(selected.key);
  const change = comparison?.change ?? null;
  const positive = change == null || change === 0 || (decreaseIsPositive ? change < 0 : change > 0);
  const TrendIcon = change != null && change < 0 ? ArrowDownRight : ArrowUpRight;
  const SelectedIcon = selected.Icon;

  return (
    <Screen>
      <View style={styles.heading}>
        <View style={styles.headingTop}>
          <View style={styles.headingCopy}>
            <Text style={styles.eyebrow}>ACOMPANHAMENTO</Text>
            <Text style={styles.title}>Meu progresso</Text>
          </View>
          <Pressable style={styles.quickMeasure} onPress={() => navigation.navigate("AddMeasurement")}>
            <CirclePlus size={18} color={colors.ink} strokeWidth={2.6} />
            <Text style={styles.quickMeasureText}>Nova medida</Text>
          </Pressable>
        </View>
        <Text style={styles.lead}>Transforme seus registros em decisões mais conscientes sobre sua jornada.</Text>
      </View>

      <View style={styles.lifetimeCard}>
        <View style={styles.lifetimeTop}>
          <View style={styles.lifetimeIcon}><Trophy size={24} color={colors.accent} strokeWidth={2.35} /></View>
          <View style={styles.lifetimeCopy}>
            <Text style={styles.lifetimeEyebrow}>SUA JORNADA</Text>
            <Text style={styles.lifetimeTitle}>Consistência acumulada</Text>
          </View>
          <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>ATIVO</Text></View>
        </View>
        <View style={styles.lifetimeNumberRow}>
          <Text style={styles.lifetimeNumber}>{formatNumber(totals.sessions)}</Text>
          <Text style={styles.lifetimeUnit}>aulas</Text>
        </View>
        <Text style={styles.lifetimeDescription}>Cada aula concluída registra mais um passo real na sua evolução.</Text>
        <View style={styles.lifetimeStats}>
          {[
            [Dumbbell, formatNumber(totals.workouts), "treinos"],
            [Clock3, formatNumber(totals.minutes), "minutos"],
            [CalendarDays, formatNumber(totals.activeDays), "dias ativos"],
          ].map(([Icon, value, label]) => (
            <View style={styles.lifetimeStat} key={label}>
              <Icon size={15} color={colors.primaryLight} />
              <Text style={styles.lifetimeStatValue}>{value}</Text>
              <Text style={styles.lifetimeStatLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionHead}>
        <View>
          <Text style={styles.sectionEyebrow}>EVOLUÇÃO CORPORAL</Text>
          <Text style={styles.sectionTitle}>Suas medidas</Text>
          <Text style={styles.sectionSubtitle}>Compare cada registro com seu ponto de partida</Text>
        </View>
        <View style={styles.sectionIcon}><Ruler size={20} color={colors.primaryLight} /></View>
      </View>

      <View style={styles.selector}>
        {options.map((option) => {
          const Icon = option.Icon;
          const active = selected.key === option.key;
          return (
            <Pressable key={option.key} style={[styles.option, active && styles.optionActive]} onPress={() => setSelected(option)}>
              <Icon size={16} color={active ? colors.ink : colors.muted} />
              <Text style={[styles.optionText, active && styles.optionTextActive]}>{option.short}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHeading}>
          <View>
            <View style={styles.metricLabel}><SelectedIcon size={14} color={colors.accent} /><Text style={styles.small}>{selected.label.toUpperCase()}</Text></View>
            <Text style={styles.current}>{comparison?.current ?? "—"}<Text style={styles.currentUnit}> {selected.unit}</Text></Text>
          </View>
          {comparison && (
            <View style={[styles.change, positive ? styles.changePositive : styles.changeNeutral]}>
              <TrendIcon size={16} color={positive ? colors.success : colors.warning} />
              <View>
                <Text style={[styles.changeValue, { color: positive ? colors.success : colors.warning }]}>{change > 0 ? "+" : ""}{change} {selected.unit}</Text>
                <Text style={styles.changeCaption}>desde o início</Text>
              </View>
            </View>
          )}
        </View>
        <TrendChart data={state.evolution.measurements} field={selected.key} unit={selected.unit} />
        {comparison && (
          <View style={styles.compare}>
            <View><Text style={styles.compareLabel}>PRIMEIRO REGISTRO</Text><Text style={styles.compareValue}>{comparison.initial} {selected.unit}</Text></View>
            <View style={styles.compareDivider} />
            <View><Text style={styles.compareLabel}>ÚLTIMO REGISTRO</Text><Text style={styles.compareValue}>{comparison.current} {selected.unit}</Text></View>
          </View>
        )}
      </View>

      <View style={styles.sectionHead}>
        <View>
          <Text style={styles.sectionEyebrow}>ÚLTIMOS 7 DIAS</Text>
          <Text style={styles.sectionTitle}>Seu ritmo nesta semana</Text>
          <Text style={styles.sectionSubtitle}>Frequência e tempo dedicados às aulas</Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        {[
          [Dumbbell, "Treinos", activity.workouts],
          [Clock3, "Minutos", activity.minutes],
          [CalendarDays, "Dias ativos", activity.activeDays],
        ].map(([Icon, label, value]) => (
          <View style={styles.statCard} key={label}>
            <View style={styles.statIcon}><Icon size={17} color={colors.primaryLight} /></View>
            <Text style={styles.statValue}>{formatNumber(value)}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <WeeklyActivity data={activity.daily} />

      <View style={styles.sectionHead}>
        <View><Text style={styles.sectionTitle}>Conquistas</Text><Text style={styles.sectionSubtitle}>Pequenas vitórias constroem sua constância</Text></View>
      </View>
      <View style={styles.achievements}>
        {activity.achievements.map((item) => {
          const Icon = item.code === "FOCUS" ? Target : item.code === "DISCIPLINE" ? Medal : Trophy;
          return (
            <View style={[styles.achievement, item.unlocked && styles.achievementUnlocked]} key={item.code}>
              <View style={styles.achievementTop}>
                <View style={[styles.achievementIcon, item.unlocked && styles.achievementIconUnlocked]}>
                  <Icon size={22} color={item.unlocked ? colors.text : colors.primaryLight} strokeWidth={2.35} />
                </View>
                <Text style={styles.achievementText}>{item.unlocked ? "FEITO" : `${item.current}/${item.target}`}</Text>
              </View>
              <Text style={styles.achievementTitle}>{item.title}</Text>
              <Text style={styles.achievementSubtitle}>{item.subtitle}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.sectionHead}>
        <View><Text style={styles.sectionTitle}>Histórico de medidas</Text><Text style={styles.sectionSubtitle}>{state.evolution.measurements.length} avaliações registradas</Text></View>
      </View>
      {state.evolution.measurements.length ? (
        state.evolution.measurements.slice().reverse().map((item, index) => (
          <View style={styles.history} key={item.id}>
            <View style={styles.historyIcon}><Scale color={index === 0 ? colors.accent : colors.primaryLight} size={19} /></View>
            <View style={styles.historyCopy}>
              <View style={styles.historyTop}><Text style={styles.historyDate}>{formatDate(item.measuredAt, { day: "2-digit", month: "long", year: "numeric" })}</Text>{index === 0 && <Text style={styles.latestPill}>RECENTE</Text>}</View>
              <Text style={styles.historyValues}>{item.weightKg != null ? `${item.weightKg} kg` : "Peso não informado"} · {item.waistCm != null ? `${item.waistCm} cm cintura` : "Cintura não informada"}</Text>
            </View>
            <ChevronRight size={20} color={colors.subtle} />
          </View>
        ))
      ) : <Empty title="Registre sua primeira medida" text="Acompanhe sua evolução com dados que fazem sentido para você." />}

      <View style={styles.sectionHead}>
        <View><Text style={styles.sectionEyebrow}>COMPARAÇÃO VISUAL</Text><Text style={styles.sectionTitle}>Fotos de evolução</Text><Text style={styles.sectionSubtitle}>Frente, lado e costas organizados por data</Text></View>
      </View>
      <PhotoComparison photos={state.photos} onAdd={() => navigation.navigate("AddPhoto")} />
    </Screen>
  );
}

export function AddMeasurementScreen({ navigation, route }) {
  const isInitial = Boolean(route.params?.initial);
  const [form, setForm] = useState({
    measuredAt: localDateKey(),
    notes: "",
    ...Object.fromEntries(measurementFieldKeys.map((key) => [key, ""])),
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [photos, setPhotos] = useState({ FRONT: null, SIDE: null, BACK: null });
  const [activePhotoPose, setActivePhotoPose] = useState("FRONT");
  const completeFields = useMemo(
    () => measurementFieldKeys.filter((key) => form[key] !== "").length,
    [form],
  );
  const essentialFields = isInitial ? initialMeasurementFields : quickMeasurementFields;
  const detailGroups = isInitial
    ? additionalMeasurementGroups.map((group) => ({ ...group, fields: group.fields.filter(([key]) => key !== "heightCm") }))
    : additionalMeasurementGroups;
  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const photoCount = Object.values(photos).filter(Boolean).length;
  const chooseMeasurementPhoto = async (source) => {
    setError("");
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return setError("Permita o acesso à câmera para tirar sua foto.");
    }
    const launcher = source === "camera" ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await launcher({ mediaTypes: ["images"], allowsEditing: false, quality: 0.8 });
    if (!result.canceled) setPhotos((current) => ({ ...current, [activePhotoPose]: result.assets[0] }));
  };
  const uploadMeasurementPhoto = async (asset, pose) => {
    const body = new FormData();
    const name = asset.fileName || `evolucao-${pose.toLowerCase()}-${Date.now()}.jpg`;
    if (Platform.OS === "web" && asset.file) body.append("image", asset.file, name);
    else body.append("image", { uri: asset.uri, name, type: asset.mimeType || "image/jpeg" });
    const { data } = await api.post("/uploads", body, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    });
    return data.url;
  };
  const submit = async () => {
    if (isInitial && (!form.weightKg || !form.heightCm)) {
      setError("Informe seu peso e sua altura para criar o ponto de partida. A gordura corporal é opcional.");
      return;
    }
    if (!completeFields) {
      setError("Informe pelo menos uma medida antes de salvar.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const selectedPhotos = Object.entries(photos).filter(([, asset]) => asset);
      const uploadedPhotos = await Promise.all(selectedPhotos.map(async ([pose, asset]) => ({
        pose,
        photoUrl: await uploadMeasurementPhoto(asset, pose),
      })));
      await api.post("/measurements", form);
      await Promise.all(uploadedPhotos.map((photo) => api.post("/progress-photos", {
        ...photo,
        takenAt: form.measuredAt,
        notes: form.notes || null,
      })));
      navigation.goBack();
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      header={isInitial ? "Medidas iniciais" : "Adicionar medidas de hoje"}
      onBack={navigation.goBack}
      headerRight={(
        <Pressable style={styles.closeMeasurement} onPress={navigation.goBack} hitSlop={8}>
          <X size={15} color={colors.muted} strokeWidth={2.4} />
          <Text style={styles.closeMeasurementText}>Fechar</Text>
        </Pressable>
      )}
    >
      <View style={styles.formHero}>
        <View style={styles.formHeroIcon}><CalendarDays size={20} color={colors.accent} /></View>
        <View style={{ flex: 1 }}>
          <View style={styles.formHeroTitleRow}><Text style={styles.formHeroTitle}>{isInitial ? "Seu ponto de partida" : "Seu registro de hoje"}</Text>{isInitial && <Text style={styles.requiredPill}>2 DADOS</Text>}</View>
          <Text style={styles.formHeroText}>{isInitial ? "Peso e altura são necessários para iniciar. A gordura corporal é opcional; você pode fechar e voltar depois." : "Preencha somente o que desejar. Seu histórico anterior permanece preservado."}</Text>
        </View>
      </View>
      <Pressable style={styles.dateShortcut} onPress={() => setShowDate((value) => !value)}>
        <View style={styles.dateShortcutCopy}><CalendarDays size={16} color={colors.primaryLight} /><Text style={styles.dateShortcutText}>Data: {form.measuredAt}</Text></View>
        <Text style={styles.dateShortcutAction}>{showDate ? "Fechar" : "Alterar"}</Text>
      </Pressable>
      {showDate && (
        <View style={styles.dateCard}>
          <View><Text style={styles.fieldLabel}>DATA DA AVALIAÇÃO</Text><Text style={styles.dateHint}>Formato AAAA-MM-DD</Text></View>
          <TextInput style={styles.dateInput} value={form.measuredAt} onChangeText={(value) => update("measuredAt", value)} placeholder="AAAA-MM-DD" placeholderTextColor={colors.subtle} />
        </View>
      )}
      <View style={styles.formProgress}><Text style={styles.formProgressText}>{isInitial ? `${[form.weightKg, form.heightCm].filter(Boolean).length} de 2 essenciais` : `${Math.max(0, completeFields)} medida${completeFields === 1 ? "" : "s"} preenchida${completeFields === 1 ? "" : "s"}`}</Text><Text style={styles.formProgressOptional}>{isInitial ? "gordura é opcional" : "preencha só o necessário"}</Text></View>

      <View style={styles.measureGroup}>
        <Text style={styles.measureGroupTitle}>{isInitial ? "Base da sua evolução" : "Medidas essenciais"}</Text>
        <Text style={styles.measureGroupDescription}>{isInitial ? "Informe peso e altura. Se souber, acrescente o percentual de gordura." : "Registre uma ou mais medidas para criar seu ponto de comparação."}</Text>
        <View style={styles.fieldsGrid}>{essentialFields.map(([key, label, unit]) => <InputField key={key} label={label} unit={unit} value={form[key]} onChangeText={(value) => update(key, value)} />)}</View>
      </View>

      <Pressable style={styles.addDetails} onPress={() => setShowDetails((value) => !value)}>
        <View style={styles.addDetailsIcon}><CirclePlus size={19} color={colors.ink} /></View>
        <View style={{ flex: 1 }}><Text style={styles.addDetailsTitle}>{showDetails ? "Ocultar medidas extras" : "Adicionar mais medidas"}</Text><Text style={styles.addDetailsText}>Braços, coxas, panturrilhas e outras circunferências.</Text></View>
        <ChevronRight size={19} color={colors.primaryLight} style={showDetails && { transform: [{ rotate: "90deg" }] }} />
      </Pressable>
      {showDetails && detailGroups.map((group) => (
        <View style={styles.measureGroup} key={group.title}>
          <Text style={styles.measureGroupTitle}>{group.title}</Text>
          <Text style={styles.measureGroupDescription}>{group.description}</Text>
          <View style={styles.fieldsGrid}>{group.fields.map(([key, label, unit]) => <InputField key={key} label={label} unit={unit} value={form[key]} onChangeText={(value) => update(key, value)} />)}</View>
        </View>
      ))}

      {showDetails && <View style={styles.notesCard}>
        <Text style={styles.measureGroupTitle}>Observações</Text>
        <TextInput style={styles.notesInput} multiline textAlignVertical="top" value={form.notes} onChangeText={(value) => update("notes", value)} placeholder="Como você se sentiu? Houve algo diferente hoje?" placeholderTextColor={colors.subtle} />
      </View>}
      <View style={styles.measurePhotoCard}>
        <View style={styles.measurePhotoHeader}>
          <View style={styles.measurePhotoIcon}><Camera size={19} color={colors.primaryLight} /></View>
          <View style={{ flex: 1 }}><View style={styles.measurePhotoTitleRow}><Text style={styles.measureGroupTitle}>Fotos desta avaliação</Text><Text style={styles.optionalPill}>OPCIONAL</Text></View><Text style={styles.measureGroupDescription}>Adicione frente, lado ou costas agora. Você também pode fazer isso depois.</Text></View>
        </View>
        <View style={styles.measurePhotoPoses}>
          {photoPoses.map((pose) => {
            const asset = photos[pose.key];
            const active = activePhotoPose === pose.key;
            return (
              <Pressable key={pose.key} onPress={() => setActivePhotoPose(pose.key)} style={[styles.measurePhotoPose, active && styles.measurePhotoPoseActive]}>
                {asset ? <Image source={{ uri: asset.uri }} style={styles.measurePhotoThumb} /> : <Camera size={17} color={active ? colors.primaryLight : colors.subtle} />}
                <Text style={[styles.measurePhotoPoseText, active && styles.measurePhotoPoseTextActive]}>{pose.label}</Text>
                {asset ? <View style={styles.measurePhotoCheck}><Check size={10} color={colors.ink} strokeWidth={3} /></View> : null}
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.measurePhotoHint}>{photoCount ? `${photoCount} foto${photoCount === 1 ? "" : "s"} pronta${photoCount === 1 ? "" : "s"}` : `Adicionar foto de ${photoPoses.find((pose) => pose.key === activePhotoPose)?.label.toLowerCase()}`}</Text>
        <View style={styles.measurePhotoActions}>
          <Pressable style={styles.measurePhotoPrimary} onPress={() => chooseMeasurementPhoto("camera")}><Camera size={17} color={colors.ink} /><Text style={styles.measurePhotoPrimaryText}>Tirar foto</Text></Pressable>
          <Pressable style={styles.measurePhotoSecondary} onPress={() => chooseMeasurementPhoto("gallery")}><ImagePlus size={17} color={colors.primaryLight} /><Text style={styles.measurePhotoSecondaryText}>Galeria</Text></Pressable>
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.formSubmit}><Button title={saving ? "Salvando..." : photoCount ? `Salvar avaliação e ${photoCount} foto${photoCount === 1 ? "" : "s"}` : "Salvar avaliação"} icon={Scale} onPress={submit} disabled={saving} /></View>
    </Screen>
  );
}

export function AddPhotoScreen({ navigation }) {
  const [assets, setAssets] = useState({ FRONT: null, SIDE: null, BACK: null });
  const [activePose, setActivePose] = useState("FRONT");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const selectedCount = Object.values(assets).filter(Boolean).length;
  const choose = async (source) => {
    setError("");
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return setError("Permita o acesso à câmera para tirar sua foto.");
    }
    const launcher = source === "camera" ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await launcher({ mediaTypes: ["images"], allowsEditing: false, quality: 0.8 });
    if (!result.canceled) setAssets((old) => ({ ...old, [activePose]: result.assets[0] }));
  };
  const upload = async (asset, pose) => {
    const formData = new FormData();
    const name = asset.fileName || `evolucao-${pose.toLowerCase()}-${Date.now()}.jpg`;
    if (Platform.OS === "web" && asset.file) formData.append("image", asset.file, name);
    else formData.append("image", { uri: asset.uri, name, type: asset.mimeType || "image/jpeg" });
    const uploaded = await api.post("/uploads", formData, { headers: { "Content-Type": "multipart/form-data" }, timeout: 120000 });
    return uploaded.data.url;
  };
  const submit = async () => {
    const selected = Object.entries(assets).filter(([, asset]) => asset);
    if (!selected.length) return setError("Adicione pelo menos uma foto: frente, lado ou costas.");
    setSaving(true);
    setError("");
    try {
      const uploaded = await Promise.all(selected.map(async ([pose, asset]) => ({ pose, photoUrl: await upload(asset, pose) })));
      const takenAt = localDateKey();
      await Promise.all(uploaded.map((item) => api.post("/progress-photos", { ...item, takenAt, notes: notes || null })));
      navigation.goBack();
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Screen header="Novo registro visual" onBack={navigation.goBack}>
      <View style={styles.photoFormHero}>
        <View style={styles.photoFormHeroIcon}><Camera color={colors.accent} size={22} /></View>
        <View style={{ flex: 1 }}><Text style={styles.photoFormHeroTitle}>Seu progresso em 3 ângulos</Text><Text style={styles.photoFormLead}>Use a mesma luz, distância e posição. Você pode adicionar uma, duas ou as três fotos.</Text></View>
        <View style={styles.photoCount}><Text style={styles.photoCountValue}>{selectedCount}/3</Text><Text style={styles.photoCountLabel}>PRONTAS</Text></View>
      </View>

      <View style={styles.poseCards}>
        {photoPoses.map((pose) => {
          const asset = assets[pose.key];
          const active = activePose === pose.key;
          return (
            <Pressable key={pose.key} onPress={() => setActivePose(pose.key)} style={[styles.poseCard, active && styles.poseCardActive]}>
              <View style={styles.poseThumb}>{asset ? <Image source={{ uri: asset.uri }} style={styles.poseThumbImage} /> : <Camera size={18} color={active ? colors.primaryLight : colors.subtle} />}</View>
              <Text style={[styles.poseCardTitle, active && styles.poseCardTitleActive]}>{pose.label}</Text>
              <Text style={styles.poseCardHint}>{asset ? "Adicionada" : pose.hint}</Text>
              {asset && <View style={styles.poseCheck}><Check size={11} color={colors.ink} strokeWidth={3} /></View>}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.photoPickerCard}>
        <Text style={styles.photoPickerEyebrow}>FOTO DE {photoPoses.find((pose) => pose.key === activePose)?.label.toUpperCase()}</Text>
        <Text style={styles.photoPickerTitle}>{assets[activePose] ? "Foto pronta para salvar" : "Como deseja adicionar?"}</Text>
        {assets[activePose] && <Image source={{ uri: assets[activePose].uri }} style={styles.activePhotoPreview} resizeMode="cover" />}
        <View style={styles.photoSourceRow}>
          <Pressable style={styles.photoSourcePrimary} onPress={() => choose("camera")}><Camera size={18} color={colors.ink} /><Text style={styles.photoSourcePrimaryText}>Tirar foto</Text></Pressable>
          <Pressable style={styles.photoSourceSecondary} onPress={() => choose("gallery")}><ImagePlus size={18} color={colors.primaryLight} /><Text style={styles.photoSourceSecondaryText}>Galeria</Text></Pressable>
        </View>
      </View>
      <View style={styles.notesCard}><Text style={styles.measureGroupTitle}>Observação</Text><TextInput style={styles.notesInput} multiline textAlignVertical="top" value={notes} onChangeText={setNotes} placeholder="Ex.: início do acompanhamento, 30 dias..." placeholderTextColor={colors.subtle} /></View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={saving ? "Enviando fotos..." : `Salvar registro${selectedCount ? ` (${selectedCount})` : ""}`} icon={Camera} onPress={submit} disabled={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: 23 },
  headingTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  headingCopy: { flex: 1 },
  quickMeasure: { minHeight: 42, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 14, backgroundColor: colors.primaryLight },
  quickMeasureText: { color: colors.ink, fontFamily: fonts.display, fontSize: 13, letterSpacing: 0.15 },
  eyebrow: { color: colors.primaryLight, fontSize: 10, fontWeight: "900", letterSpacing: 1.35 },
  title: { marginTop: 7, color: colors.text, fontFamily: fonts.displayBold, fontSize: 36, lineHeight: 43, letterSpacing: 0.1 },
  lead: { marginTop: 7, maxWidth: 325, color: colors.muted, fontSize: 14, lineHeight: 21 },
  initialMeasurementCard: { padding: 22, overflow: "hidden", borderWidth: 1, borderColor: "rgba(232,136,91,.48)", borderRadius: radii.card, backgroundColor: colors.surface },
  initialMeasurementIcon: { width: 58, height: 58, marginBottom: 20, alignItems: "center", justifyContent: "center", borderRadius: 19, backgroundColor: colors.primary },
  initialMeasurementEyebrow: { color: colors.primaryLight, fontFamily: fonts.semibold, fontSize: 8, letterSpacing: 1.3 },
  initialMeasurementTitle: { marginTop: 7, color: colors.text, fontFamily: fonts.displayBold, fontSize: 29, lineHeight: 35 },
  initialMeasurementText: { marginTop: 10, color: colors.muted, fontSize: 12, lineHeight: 19 },
  initialMeasurementBenefits: { marginVertical: 20, padding: 14, gap: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.surface2 },
  initialMeasurementBenefit: { flexDirection: "row", alignItems: "center", gap: 9 },
  initialMeasurementDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  initialMeasurementBenefitText: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 11, lineHeight: 16 },
  initialMeasurementActions: { gap: 12 },
  skipMeasurement: { minHeight: 43, alignItems: "center", justifyContent: "center", borderRadius: 13 },
  skipMeasurementText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 12 },
  lifetimeCard: { marginBottom: 10, padding: 17, borderWidth: 1, borderColor: "rgba(245,179,141,.3)", borderRadius: radii.card, backgroundColor: colors.surface },
  lifetimeTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  lifetimeIcon: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(245,179,141,.3)", borderRadius: 16, backgroundColor: "rgba(245,179,141,.08)" },
  lifetimeCopy: { flex: 1 },
  lifetimeEyebrow: { color: colors.primaryLight, fontSize: 7, fontWeight: "900", letterSpacing: 1.05 },
  lifetimeTitle: { marginTop: 4, color: colors.text, fontFamily: fonts.display, fontSize: 17, lineHeight: 21 },
  livePill: { paddingVertical: 5, paddingHorizontal: 7, flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 9, backgroundColor: "rgba(169,196,154,.1)" },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.success },
  liveText: { color: colors.success, fontSize: 7, fontWeight: "900", letterSpacing: 0.7 },
  lifetimeNumberRow: { marginTop: 17, flexDirection: "row", alignItems: "flex-end", gap: 7 },
  lifetimeNumber: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 39, lineHeight: 43, letterSpacing: -0.3 },
  lifetimeUnit: { marginBottom: 6, color: colors.accent, fontSize: 12, fontWeight: "900" },
  lifetimeDescription: { marginTop: 5, color: colors.muted, fontSize: 10, lineHeight: 15 },
  lifetimeStats: { marginTop: 15, paddingTop: 13, flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.line },
  lifetimeStat: { flex: 1, alignItems: "center", gap: 3, borderRightWidth: 1, borderRightColor: colors.line },
  lifetimeStatValue: { marginTop: 2, color: colors.text, fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 19 },
  lifetimeStatLabel: { color: colors.subtle, fontSize: 8, fontWeight: "700" },
  statsRow: { marginBottom: 14, flexDirection: "row", gap: 8 },
  statCard: { flex: 1, minHeight: 116, padding: 11, justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.surface },
  statIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.surface3 },
  statValue: { marginTop: 8, color: colors.text, fontFamily: fonts.displayBold, fontSize: 24, lineHeight: 29 },
  statLabel: { marginTop: 2, color: colors.muted, fontSize: 9, fontWeight: "800" },
  weeklyCard: { marginBottom: 4, padding: 17, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface },
  weeklyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  weeklyEyebrow: { color: colors.primaryLight, fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  weeklyTitle: { marginTop: 4, color: colors.text, fontFamily: fonts.display, fontSize: 19, lineHeight: 23 },
  weekBars: { height: 146, marginTop: 18, flexDirection: "row", alignItems: "flex-end", gap: 7 },
  weekDay: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end" },
  barTrack: { width: 16, height: 93, justifyContent: "flex-end", overflow: "hidden", borderRadius: 8, backgroundColor: colors.surface3 },
  barFill: { width: "100%", borderRadius: 8, backgroundColor: colors.primaryLight },
  weekValue: { marginTop: 5, color: colors.text, fontSize: 8, fontWeight: "800" },
  weekLabel: { marginTop: 3, color: colors.subtle, fontSize: 8, textTransform: "capitalize" },
  weekCaption: { marginTop: 10, color: colors.subtle, fontSize: 9, textAlign: "center" },
  achievements: { marginBottom: 18, flexDirection: "row", gap: 9 },
  achievement: { flex: 1, minHeight: 138, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 20, backgroundColor: colors.surface2 },
  achievementUnlocked: { borderColor: "rgba(232,136,91,.72)", backgroundColor: "rgba(158,63,34,.2)" },
  achievementTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  achievementIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(232,136,91,.42)", borderRadius: 14, backgroundColor: colors.surface3 },
  achievementIconUnlocked: { borderColor: "rgba(232,136,91,.7)", backgroundColor: colors.primary },
  achievementTitle: { marginTop: 17, color: colors.text, fontFamily: fonts.display, fontSize: 14, lineHeight: 18 },
  achievementText: { color: colors.primaryLight, fontSize: 9, fontWeight: "900", letterSpacing: 0.55 },
  achievementSubtitle: { marginTop: 4, color: colors.muted, fontSize: 8, lineHeight: 12 },
  selector: { padding: 4, flexDirection: "row", gap: 3, borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.surface },
  option: { flex: 1, minHeight: 56, alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 14 },
  optionActive: { backgroundColor: colors.primaryLight },
  optionText: { color: colors.muted, fontSize: 9, fontWeight: "800" },
  optionTextActive: { color: colors.ink },
  chartCard: { marginTop: 14, padding: 17, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface },
  chartHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metricLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  small: { color: colors.muted, fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  current: { marginTop: 4, color: colors.text, fontFamily: fonts.displayBold, fontSize: 35, lineHeight: 42, letterSpacing: 0 },
  currentUnit: { color: colors.muted, fontSize: 15, fontWeight: "700", letterSpacing: 0 },
  change: { paddingVertical: 8, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 14 },
  changePositive: { backgroundColor: "rgba(169,196,154,.12)" },
  changeNeutral: { backgroundColor: "rgba(242,192,120,.12)" },
  changeValue: { fontFamily: fonts.display, fontSize: 13, lineHeight: 16 },
  changeCaption: { marginTop: 1, color: colors.muted, fontSize: 8, fontWeight: "700" },
  chartWrap: { marginTop: 10 },
  chartUnit: { marginTop: -4, color: colors.subtle, fontSize: 9, textAlign: "right" },
  chartEmpty: { height: 184, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 25 },
  chartEmptyTitle: { color: colors.text, fontSize: 13, fontWeight: "800", textAlign: "center" },
  chartEmptyText: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: "center" },
  compare: { marginTop: 7, paddingTop: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.line },
  compareLabel: { color: colors.subtle, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  compareValue: { marginTop: 4, color: colors.text, fontFamily: fonts.display, fontSize: 14, lineHeight: 18 },
  compareDivider: { width: 1, height: 26, backgroundColor: colors.line },
  sectionHead: { marginTop: 27, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionEyebrow: { marginBottom: 3, color: colors.primaryLight, fontSize: 8, fontWeight: "900", letterSpacing: 1.05 },
  sectionIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(245,179,141,.3)", borderRadius: 14, backgroundColor: "rgba(245,179,141,.08)" },
  sectionTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 21, lineHeight: 26, letterSpacing: 0.1 },
  sectionSubtitle: { marginTop: 3, color: colors.muted, fontSize: 11 },
  history: { minHeight: 73, marginBottom: 9, padding: 12, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: colors.line, borderRadius: radii.input, backgroundColor: colors.surface },
  historyIcon: { width: 43, height: 43, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: colors.surface3 },
  historyCopy: { flex: 1 },
  historyTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  historyDate: { color: colors.text, fontFamily: fonts.display, fontSize: 14, lineHeight: 18, textTransform: "capitalize" },
  latestPill: { paddingVertical: 3, paddingHorizontal: 6, borderRadius: 7, color: colors.ink, backgroundColor: colors.accent, fontSize: 7, fontWeight: "900", overflow: "hidden" },
  historyValues: { marginTop: 5, color: colors.muted, fontSize: 10 },
  addPhoto: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface2 },
  photos: { flexDirection: "row", gap: 8 },
  photoWrap: { flex: 1, overflow: "hidden", borderRadius: 15, backgroundColor: colors.surface3 },
  photo: { width: "100%", aspectRatio: 0.72 },
  photoLabel: { paddingVertical: 7, alignItems: "center" },
  photoLabelText: { color: colors.text, fontSize: 9, fontWeight: "800" },
  photoEmpty: { minHeight: 91, padding: 13, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderStyle: "dashed", borderColor: colors.line, borderRadius: radii.input, backgroundColor: colors.surface },
  photoEmptyIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.surface3 },
  photoEmptyTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 14, lineHeight: 18 },
  photoEmptyText: { marginTop: 3, color: colors.muted, fontSize: 10 },
  comparisonCard: { padding: 15, borderWidth: 1, borderColor: "rgba(245,179,141,.34)", borderRadius: radii.card, backgroundColor: colors.surface },
  comparisonTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  comparisonEyebrow: { color: colors.primaryLight, fontSize: 8, fontWeight: "900", letterSpacing: 1.15 },
  comparisonTitle: { marginTop: 5, color: colors.text, fontFamily: fonts.display, fontSize: 20, lineHeight: 24 },
  comparisonSubtitle: { marginTop: 4, color: colors.muted, fontSize: 10, lineHeight: 15, textTransform: "capitalize" },
  comparisonAdd: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.primaryLight },
  comparisonPeriods: { paddingTop: 15, paddingBottom: 3, gap: 7 },
  comparisonPeriod: { minHeight: 35, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface2 },
  comparisonPeriodActive: { borderColor: colors.primaryLight, backgroundColor: "rgba(245,179,141,.12)" },
  comparisonPeriodText: { color: colors.muted, fontSize: 10, fontWeight: "800", textTransform: "capitalize" },
  comparisonPeriodTextActive: { color: colors.primaryLight },
  comparisonColumnsHead: { marginTop: 16, paddingBottom: 8, paddingLeft: 35, flexDirection: "row", gap: 8 },
  comparisonColumnLabel: { flex: 1, color: colors.subtle, fontSize: 8, fontWeight: "900", letterSpacing: 0.7, textAlign: "center", textTransform: "uppercase" },
  comparisonColumnNow: { color: colors.primaryLight },
  comparisonPose: { marginBottom: 12 },
  comparisonPoseLabel: { marginBottom: 6, color: colors.muted, fontSize: 8, fontWeight: "900", letterSpacing: 0.9 },
  comparisonPair: { flexDirection: "row", gap: 8 },
  comparisonSlot: { flex: 1, overflow: "hidden", borderWidth: 1, borderColor: colors.line, borderRadius: 15, backgroundColor: colors.surface2 },
  comparisonImage: { width: "100%", aspectRatio: 0.86 },
  comparisonMissing: { aspectRatio: 0.86, alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: colors.surface3 },
  comparisonMissingText: { color: colors.subtle, fontSize: 9, fontWeight: "700" },
  comparisonSlotLabel: { paddingVertical: 7, alignItems: "center", borderTopWidth: 1, borderTopColor: colors.line },
  comparisonSlotLabelText: { color: colors.text, fontSize: 9, fontWeight: "900" },
  formHero: { marginBottom: 13, padding: 16, flexDirection: "row", gap: 12, borderWidth: 1, borderColor: "rgba(245,179,141,.32)", borderRadius: radii.card, backgroundColor: "rgba(245,179,141,.08)" },
  formHeroIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "rgba(245,179,141,.15)" },
  formHeroTitleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 7 },
  formHeroTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 17, lineHeight: 21 },
  optionalPill: { paddingVertical: 3, paddingHorizontal: 6, overflow: "hidden", borderRadius: 7, color: colors.primaryLight, backgroundColor: "rgba(245,179,141,.12)", fontSize: 7, fontWeight: "900", letterSpacing: 0.7 },
  requiredPill: { paddingVertical: 3, paddingHorizontal: 7, overflow: "hidden", borderRadius: 7, color: colors.ink, backgroundColor: colors.primaryLight, fontSize: 7, fontWeight: "900", letterSpacing: 0.7 },
  formHeroText: { marginTop: 4, color: colors.muted, fontSize: 11, lineHeight: 16 },
  closeMeasurement: { minHeight: 36, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface },
  closeMeasurementText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 10 },
  dateShortcut: { marginBottom: 2, paddingVertical: 12, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface },
  dateShortcutCopy: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateShortcutText: { color: colors.text, fontSize: 11, fontWeight: "800" },
  dateShortcutAction: { color: colors.primaryLight, fontSize: 11, fontWeight: "900" },
  dateCard: { padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: radii.input, backgroundColor: colors.surface },
  dateHint: { marginTop: 3, color: colors.subtle, fontSize: 9 },
  dateInput: { width: 115, paddingVertical: 10, paddingHorizontal: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 11, color: colors.text, fontSize: 12, fontWeight: "800", textAlign: "center", backgroundColor: colors.surface2 },
  formProgress: { marginTop: 10, marginBottom: 4, flexDirection: "row", justifyContent: "space-between" },
  formProgressText: { color: colors.primaryLight, fontSize: 10, fontWeight: "800" },
  formProgressOptional: { color: colors.subtle, fontSize: 10 },
  measureGroup: { marginTop: 14, padding: 15, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface },
  measureGroupTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 17, lineHeight: 21 },
  measureGroupDescription: { marginTop: 4, color: colors.muted, fontSize: 10, lineHeight: 15 },
  fieldsGrid: { marginTop: 13, flexDirection: "row", flexWrap: "wrap", gap: 9 },
  addDetails: { marginTop: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: "rgba(245,179,141,.42)", borderRadius: radii.card, backgroundColor: "rgba(245,179,141,.08)" },
  addDetailsIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.primaryLight },
  addDetailsTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 16, lineHeight: 20 },
  addDetailsText: { marginTop: 2, color: colors.muted, fontSize: 9, lineHeight: 14 },
  fieldWrap: { width: "48.5%" },
  fieldLabel: { color: colors.muted, fontSize: 9, fontWeight: "900", letterSpacing: 0.55 },
  fieldControl: { height: 46, marginTop: 6, paddingLeft: 11, paddingRight: 9, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.surface2 },
  fieldInput: { flex: 1, height: "100%", color: colors.text, fontSize: 13, fontWeight: "800" },
  fieldUnit: { color: colors.subtle, fontSize: 10, fontWeight: "800" },
  notesCard: { marginTop: 14, padding: 15, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface },
  notesInput: { minHeight: 91, marginTop: 9, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 13, color: colors.text, fontSize: 12, lineHeight: 18, backgroundColor: colors.surface2 },
  measurePhotoCard: { marginTop: 18, padding: 15, borderWidth: 1, borderColor: "rgba(245,179,141,.34)", borderRadius: radii.card, backgroundColor: colors.surface },
  measurePhotoHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  measurePhotoIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: colors.surface3 },
  measurePhotoTitleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 7 },
  measurePhotoPoses: { marginTop: 14, flexDirection: "row", gap: 9 },
  measurePhotoPose: { position: "relative", flex: 1, height: 82, overflow: "hidden", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 15, backgroundColor: colors.surface2 },
  measurePhotoPoseActive: { borderColor: colors.primaryLight, backgroundColor: "rgba(245,179,141,.09)" },
  measurePhotoThumb: { position: "absolute", width: "100%", height: "100%", opacity: 0.54 },
  measurePhotoPoseText: { paddingHorizontal: 6, paddingVertical: 3, overflow: "hidden", color: colors.subtle, fontFamily: fonts.bold, fontSize: 9, borderRadius: 7, backgroundColor: "rgba(9,6,5,.7)" },
  measurePhotoPoseTextActive: { color: colors.text },
  measurePhotoCheck: { position: "absolute", top: 6, right: 6, width: 18, height: 18, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: colors.success },
  measurePhotoHint: { marginTop: 12, color: colors.muted, fontFamily: fonts.semibold, fontSize: 9 },
  measurePhotoActions: { marginTop: 9, flexDirection: "row", gap: 12 },
  measurePhotoPrimary: { flex: 1, minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 14, backgroundColor: colors.primaryLight },
  measurePhotoPrimaryText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 10 },
  measurePhotoSecondary: { flex: 1, minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface2 },
  measurePhotoSecondaryText: { color: colors.text, fontFamily: fonts.bold, fontSize: 10 },
  formSubmit: { marginTop: 18, marginBottom: 8 },
  error: { marginVertical: 12, color: colors.danger, fontSize: 12, fontWeight: "700" },
  photoFormHero: { marginBottom: 14, padding: 15, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: "rgba(245,179,141,.32)", borderRadius: radii.card, backgroundColor: "rgba(245,179,141,.08)" },
  photoFormHeroIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "rgba(232,136,91,.16)" },
  photoFormHeroTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 17, lineHeight: 21 },
  photoFormLead: { marginTop: 4, color: colors.muted, fontSize: 10, lineHeight: 15 },
  photoCount: { minWidth: 47, alignItems: "center" },
  photoCountValue: { color: colors.primaryLight, fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 24 },
  photoCountLabel: { color: colors.subtle, fontSize: 6, fontWeight: "900", letterSpacing: 0.8 },
  poseCards: { marginBottom: 14, flexDirection: "row", gap: 8 },
  poseCard: { position: "relative", flex: 1, minHeight: 116, padding: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 17, backgroundColor: colors.surface },
  poseCardActive: { borderColor: colors.primaryLight, backgroundColor: "rgba(245,179,141,.09)" },
  poseThumb: { width: 42, height: 42, overflow: "hidden", alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.surface3 },
  poseThumbImage: { width: "100%", height: "100%" },
  poseCardTitle: { marginTop: 7, color: colors.muted, fontFamily: fonts.display, fontSize: 13, lineHeight: 16 },
  poseCardTitleActive: { color: colors.text },
  poseCardHint: { marginTop: 2, minHeight: 18, color: colors.subtle, fontSize: 7, lineHeight: 9, textAlign: "center" },
  poseCheck: { position: "absolute", top: 7, right: 7, width: 19, height: 19, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: colors.success },
  photoPickerCard: { marginBottom: 14, padding: 15, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface },
  photoPickerEyebrow: { color: colors.primaryLight, fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  photoPickerTitle: { marginTop: 5, color: colors.text, fontFamily: fonts.display, fontSize: 18, lineHeight: 22 },
  activePhotoPreview: { width: "100%", height: 210, marginTop: 12, borderRadius: 16, backgroundColor: colors.surface3 },
  photoSourceRow: { marginTop: 13, flexDirection: "row", gap: 8 },
  photoSourcePrimary: { flex: 1, minHeight: 47, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 14, backgroundColor: colors.primaryLight },
  photoSourcePrimaryText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 11 },
  photoSourceSecondary: { flex: 1, minHeight: 47, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface2 },
  photoSourceSecondaryText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 11 },
  picker: { height: 294, marginBottom: 20, overflow: "hidden", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderStyle: "dashed", borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface },
  pickerIcon: { width: 54, height: 54, alignItems: "center", justifyContent: "center", borderRadius: 19, backgroundColor: colors.surface3 },
  pickerTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 17, lineHeight: 21 },
  pickerText: { color: colors.muted, fontSize: 10 },
  preview: { width: "100%", height: "100%" },
  poseRow: { marginTop: 10, marginBottom: 18, flexDirection: "row", gap: 8 },
  pose: { flex: 1, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.surface },
  poseActive: { borderColor: colors.primaryLight, backgroundColor: colors.primaryLight },
  poseText: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  poseTextActive: { color: colors.ink },
});
