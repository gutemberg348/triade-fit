import { Fragment, useCallback, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Camera,
  ChevronRight,
  CirclePlus,
  Droplets,
  Dumbbell,
  Flame,
  ImagePlus,
  Clock3,
  Medal,
  Ruler,
  Scale,
  Target,
  Trophy,
  TrendingUp,
} from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Stop, Text as SvgText } from "react-native-svg";
import api, { messageFrom } from "../services/api.js";
import { Button, Empty, ErrorBox, Loading, Screen } from "../components/UI.js";
import { colors, radii } from "../theme/index.js";

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

const additionalMeasurementGroups = [
  {
    title: "Outras medidas",
    description: "Opcional: adicione apenas o que quiser acompanhar.",
    fields: [["heightCm", "Altura", "cm"], ["abdomenCm", "Abdômen", "cm"], ["chestCm", "Peitoral", "cm"]],
  },
  measurementGroups[2],
];

const formatDate = (value, style = { day: "2-digit", month: "short" }) =>
  new Intl.DateTimeFormat("pt-BR", style).format(new Date(value));
const formatNumber = (value) =>
  new Intl.NumberFormat("pt-BR").format(Number(value || 0));

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

  const comparison = state.evolution.comparison[selected.key];
  const activity = state.evolution.activity || {
    workouts: 0,
    minutes: 0,
    calories: 0,
    daily: [],
    achievements: [],
  };
  const totals = state.evolution.totals || {
    workouts: 0,
    minutes: 0,
    calories: 0,
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
        <Text style={styles.eyebrow}>ACOMPANHAMENTO</Text>
        <Text style={styles.title}>Meu progresso</Text>
        <Text style={styles.lead}>Transforme seus registros em decisões mais conscientes sobre sua jornada.</Text>
      </View>

      <View style={styles.lifetimeCard}>
        <View style={styles.lifetimeTop}>
          <View style={styles.lifetimeIcon}><Flame size={24} color={colors.accent} strokeWidth={2.35} /></View>
          <View style={styles.lifetimeCopy}>
            <Text style={styles.lifetimeEyebrow}>DESDE O PRIMEIRO TREINO</Text>
            <Text style={styles.lifetimeTitle}>Calorias acumuladas</Text>
          </View>
          <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>ATIVO</Text></View>
        </View>
        <View style={styles.lifetimeNumberRow}>
          <Text style={styles.lifetimeNumber}>{formatNumber(totals.calories)}</Text>
          <Text style={styles.lifetimeUnit}>kcal</Text>
        </View>
        <Text style={styles.lifetimeDescription}>O total cresce uma única vez a cada aula de exercício concluída.</Text>
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

      <View style={styles.statsRow}>
        {[
          [Dumbbell, "Treinos", activity.workouts],
          [Clock3, "Minutos", activity.minutes],
          [Flame, "Calorias", activity.calories],
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

      <Button title="Adicionar medidas de hoje" icon={CirclePlus} onPress={() => navigation.navigate("AddMeasurement")} />

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
        <View><Text style={styles.sectionTitle}>Fotos de evolução</Text><Text style={styles.sectionSubtitle}>Registros privados da sua jornada</Text></View>
        <Pressable style={styles.addPhoto} onPress={() => navigation.navigate("AddPhoto")}><ImagePlus size={17} color={colors.primaryLight} /></Pressable>
      </View>
      {state.photos.length ? (
        <View style={styles.photos}>
          {state.photos.slice(0, 3).map((photo) => (
            <View style={styles.photoWrap} key={photo.id}>
              <Image source={{ uri: photo.photoUrl }} style={styles.photo} />
              <View style={styles.photoLabel}><Text style={styles.photoLabelText}>{photo.pose === "FRONT" ? "Frente" : photo.pose === "SIDE" ? "Lado" : "Costas"}</Text></View>
            </View>
          ))}
        </View>
      ) : (
        <Pressable style={styles.photoEmpty} onPress={() => navigation.navigate("AddPhoto")}>
          <View style={styles.photoEmptyIcon}><Camera color={colors.primaryLight} size={22} /></View>
          <View><Text style={styles.photoEmptyTitle}>Adicione sua primeira foto</Text><Text style={styles.photoEmptyText}>Um registro visual, privado e seguro.</Text></View>
          <ChevronRight size={20} color={colors.subtle} />
        </Pressable>
      )}
    </Screen>
  );
}

export function AddMeasurementScreen({ navigation }) {
  const [form, setForm] = useState({
    measuredAt: new Date().toISOString().slice(0, 10),
    notes: "",
    ...Object.fromEntries(measurementFieldKeys.map((key) => [key, ""])),
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const completeFields = useMemo(
    () => measurementFieldKeys.filter((key) => form[key] !== "").length,
    [form],
  );
  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await api.post("/measurements", form);
      navigation.goBack();
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen header="Adicionar medidas de hoje" onBack={navigation.goBack}>
      <View style={styles.formHero}>
        <View style={styles.formHeroIcon}><CalendarDays size={20} color={colors.accent} /></View>
        <View style={{ flex: 1 }}><Text style={styles.formHeroTitle}>Seu registro de hoje</Text><Text style={styles.formHeroText}>Preencha somente o que desejar. Seu histórico anterior permanece preservado.</Text></View>
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
      <View style={styles.formProgress}><Text style={styles.formProgressText}>{Math.max(0, completeFields)} medida{completeFields === 1 ? "" : "s"} preenchida{completeFields === 1 ? "" : "s"}</Text><Text style={styles.formProgressOptional}>preencha só o necessário</Text></View>

      <View style={styles.measureGroup}>
        <Text style={styles.measureGroupTitle}>Medidas essenciais</Text>
        <Text style={styles.measureGroupDescription}>Registre uma ou mais medidas. Todas são opcionais.</Text>
        <View style={styles.fieldsGrid}>{quickMeasurementFields.map(([key, label, unit]) => <InputField key={key} label={label} unit={unit} value={form[key]} onChangeText={(value) => update(key, value)} />)}</View>
      </View>

      <Pressable style={styles.addDetails} onPress={() => setShowDetails((value) => !value)}>
        <View style={styles.addDetailsIcon}><CirclePlus size={19} color={colors.ink} /></View>
        <View style={{ flex: 1 }}><Text style={styles.addDetailsTitle}>{showDetails ? "Ocultar medidas extras" : "Adicionar mais medidas"}</Text><Text style={styles.addDetailsText}>Braços, coxas, panturrilhas e outras circunferências.</Text></View>
        <ChevronRight size={19} color={colors.primaryLight} style={showDetails && { transform: [{ rotate: "90deg" }] }} />
      </Pressable>
      {showDetails && additionalMeasurementGroups.map((group) => (
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
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={saving ? "Salvando..." : "Salvar avaliação"} icon={Scale} onPress={submit} disabled={saving} />
    </Screen>
  );
}

export function AddPhotoScreen({ navigation }) {
  const [asset, setAsset] = useState(null);
  const [pose, setPose] = useState("FRONT");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const choose = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.75 });
    if (!result.canceled) setAsset(result.assets[0]);
  };
  const submit = async () => {
    if (!asset) return setError("Selecione uma foto.");
    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", { uri: asset.uri, name: asset.fileName || `evolucao-${Date.now()}.jpg`, type: asset.mimeType || "image/jpeg" });
      const uploaded = await api.post("/uploads", formData, { headers: { "Content-Type": "multipart/form-data" } });
      await api.post("/progress-photos", { photoUrl: uploaded.data.url, pose, takenAt: new Date().toISOString().slice(0, 10), notes });
      navigation.goBack();
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Screen header="Foto de evolução" onBack={navigation.goBack}>
      <Text style={styles.photoFormLead}>Use a mesma luz e posição sempre que puder. Assim sua comparação fica mais fiel.</Text>
      <Pressable style={styles.picker} onPress={choose}>
        {asset ? <Image source={{ uri: asset.uri }} style={styles.preview} /> : <><View style={styles.pickerIcon}><Camera color={colors.primaryLight} size={27} /></View><Text style={styles.pickerTitle}>Escolher uma foto</Text><Text style={styles.pickerText}>JPG, PNG ou WebP · até 8 MB</Text></>}
      </Pressable>
      <Text style={styles.measureGroupTitle}>Posição</Text>
      <View style={styles.poseRow}>{[["FRONT", "Frente"], ["SIDE", "Lado"], ["BACK", "Costas"]].map(([key, label]) => <Pressable key={key} onPress={() => setPose(key)} style={[styles.pose, pose === key && styles.poseActive]}><Text style={[styles.poseText, pose === key && styles.poseTextActive]}>{label}</Text></Pressable>)}</View>
      <View style={styles.notesCard}><Text style={styles.measureGroupTitle}>Observação</Text><TextInput style={styles.notesInput} multiline textAlignVertical="top" value={notes} onChangeText={setNotes} placeholder="Ex.: início do acompanhamento, 30 dias..." placeholderTextColor={colors.subtle} /></View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={saving ? "Enviando..." : "Salvar foto"} icon={Camera} onPress={submit} disabled={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: 23 },
  eyebrow: { color: colors.primaryLight, fontSize: 10, fontWeight: "900", letterSpacing: 1.35 },
  title: { marginTop: 7, color: colors.text, fontSize: 33, fontWeight: "900", letterSpacing: -1 },
  lead: { marginTop: 7, maxWidth: 325, color: colors.muted, fontSize: 14, lineHeight: 21 },
  lifetimeCard: { marginBottom: 10, padding: 17, borderWidth: 1, borderColor: "rgba(245,179,141,.3)", borderRadius: radii.card, backgroundColor: colors.surface },
  lifetimeTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  lifetimeIcon: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(245,179,141,.3)", borderRadius: 16, backgroundColor: "rgba(245,179,141,.08)" },
  lifetimeCopy: { flex: 1 },
  lifetimeEyebrow: { color: colors.primaryLight, fontSize: 7, fontWeight: "900", letterSpacing: 1.05 },
  lifetimeTitle: { marginTop: 4, color: colors.text, fontSize: 15, fontWeight: "900" },
  livePill: { paddingVertical: 5, paddingHorizontal: 7, flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 9, backgroundColor: "rgba(169,196,154,.1)" },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.success },
  liveText: { color: colors.success, fontSize: 7, fontWeight: "900", letterSpacing: 0.7 },
  lifetimeNumberRow: { marginTop: 17, flexDirection: "row", alignItems: "flex-end", gap: 7 },
  lifetimeNumber: { color: colors.text, fontSize: 39, lineHeight: 43, fontWeight: "900", letterSpacing: -1.6 },
  lifetimeUnit: { marginBottom: 6, color: colors.accent, fontSize: 12, fontWeight: "900" },
  lifetimeDescription: { marginTop: 5, color: colors.muted, fontSize: 10, lineHeight: 15 },
  lifetimeStats: { marginTop: 15, paddingTop: 13, flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.line },
  lifetimeStat: { flex: 1, alignItems: "center", gap: 3, borderRightWidth: 1, borderRightColor: colors.line },
  lifetimeStatValue: { marginTop: 2, color: colors.text, fontSize: 14, fontWeight: "900" },
  lifetimeStatLabel: { color: colors.subtle, fontSize: 8, fontWeight: "700" },
  statsRow: { marginBottom: 14, flexDirection: "row", gap: 8 },
  statCard: { flex: 1, minHeight: 116, padding: 11, justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.surface },
  statIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.surface3 },
  statValue: { marginTop: 8, color: colors.text, fontSize: 22, fontWeight: "900" },
  statLabel: { marginTop: 2, color: colors.muted, fontSize: 9, fontWeight: "800" },
  weeklyCard: { marginBottom: 4, padding: 17, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface },
  weeklyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  weeklyEyebrow: { color: colors.primaryLight, fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  weeklyTitle: { marginTop: 4, color: colors.text, fontSize: 17, fontWeight: "900" },
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
  achievementTitle: { marginTop: 17, color: colors.text, fontSize: 12, fontWeight: "900" },
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
  current: { marginTop: 4, color: colors.text, fontSize: 33, fontWeight: "900", letterSpacing: -1 },
  currentUnit: { color: colors.muted, fontSize: 15, fontWeight: "700", letterSpacing: 0 },
  change: { paddingVertical: 8, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 14 },
  changePositive: { backgroundColor: "rgba(169,196,154,.12)" },
  changeNeutral: { backgroundColor: "rgba(242,192,120,.12)" },
  changeValue: { fontSize: 11, fontWeight: "900" },
  changeCaption: { marginTop: 1, color: colors.muted, fontSize: 8, fontWeight: "700" },
  chartWrap: { marginTop: 10 },
  chartUnit: { marginTop: -4, color: colors.subtle, fontSize: 9, textAlign: "right" },
  chartEmpty: { height: 184, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 25 },
  chartEmptyTitle: { color: colors.text, fontSize: 13, fontWeight: "800", textAlign: "center" },
  chartEmptyText: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: "center" },
  compare: { marginTop: 7, paddingTop: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.line },
  compareLabel: { color: colors.subtle, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  compareValue: { marginTop: 4, color: colors.text, fontSize: 12, fontWeight: "800" },
  compareDivider: { width: 1, height: 26, backgroundColor: colors.line },
  sectionHead: { marginTop: 29, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "900", letterSpacing: -0.3 },
  sectionSubtitle: { marginTop: 3, color: colors.muted, fontSize: 11 },
  history: { minHeight: 73, marginBottom: 9, padding: 12, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: colors.line, borderRadius: radii.input, backgroundColor: colors.surface },
  historyIcon: { width: 43, height: 43, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: colors.surface3 },
  historyCopy: { flex: 1 },
  historyTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  historyDate: { color: colors.text, fontSize: 12, fontWeight: "800", textTransform: "capitalize" },
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
  photoEmptyTitle: { color: colors.text, fontSize: 12, fontWeight: "800" },
  photoEmptyText: { marginTop: 3, color: colors.muted, fontSize: 10 },
  formHero: { marginBottom: 13, padding: 16, flexDirection: "row", gap: 12, borderWidth: 1, borderColor: "rgba(245,179,141,.32)", borderRadius: radii.card, backgroundColor: "rgba(245,179,141,.08)" },
  formHeroIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "rgba(245,179,141,.15)" },
  formHeroTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  formHeroText: { marginTop: 4, color: colors.muted, fontSize: 11, lineHeight: 16 },
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
  measureGroupTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  measureGroupDescription: { marginTop: 4, color: colors.muted, fontSize: 10, lineHeight: 15 },
  fieldsGrid: { marginTop: 13, flexDirection: "row", flexWrap: "wrap", gap: 9 },
  addDetails: { marginTop: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: "rgba(245,179,141,.42)", borderRadius: radii.card, backgroundColor: "rgba(245,179,141,.08)" },
  addDetailsIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.primaryLight },
  addDetailsTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  addDetailsText: { marginTop: 2, color: colors.muted, fontSize: 9, lineHeight: 14 },
  fieldWrap: { width: "48.5%" },
  fieldLabel: { color: colors.muted, fontSize: 9, fontWeight: "900", letterSpacing: 0.55 },
  fieldControl: { height: 46, marginTop: 6, paddingLeft: 11, paddingRight: 9, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.surface2 },
  fieldInput: { flex: 1, height: "100%", color: colors.text, fontSize: 13, fontWeight: "800" },
  fieldUnit: { color: colors.subtle, fontSize: 10, fontWeight: "800" },
  notesCard: { marginTop: 14, padding: 15, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface },
  notesInput: { minHeight: 91, marginTop: 9, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 13, color: colors.text, fontSize: 12, lineHeight: 18, backgroundColor: colors.surface2 },
  error: { marginVertical: 12, color: colors.danger, fontSize: 12, fontWeight: "700" },
  photoFormLead: { marginBottom: 18, color: colors.muted, fontSize: 13, lineHeight: 20 },
  picker: { height: 294, marginBottom: 20, overflow: "hidden", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderStyle: "dashed", borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface },
  pickerIcon: { width: 54, height: 54, alignItems: "center", justifyContent: "center", borderRadius: 19, backgroundColor: colors.surface3 },
  pickerTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  pickerText: { color: colors.muted, fontSize: 10 },
  preview: { width: "100%", height: "100%" },
  poseRow: { marginTop: 10, marginBottom: 18, flexDirection: "row", gap: 8 },
  pose: { flex: 1, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.surface },
  poseActive: { borderColor: colors.primaryLight, backgroundColor: colors.primaryLight },
  poseText: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  poseTextActive: { color: colors.ink },
});
