import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArrowRight, Clock3, LockKeyhole, Mail, Phone, RefreshCw, User } from "lucide-react-native";
import {
  Building2,
  CheckCircle2,
  Copy,
  CreditCard,
  Hash,
  IdCard,
  MapPin,
  QrCode,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import { Brand, Button, Screen } from "../components/UI.js";
import { useAuth } from "../contexts/AuthContext.js";
import api, { messageFrom } from "../services/api.js";
import { colors, radii } from "../theme/index.js";

const APP_CONFIG_CACHE_KEY = "@triade-fit/app-config";

const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

const maskCpfCnpj = (value) => {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 11)
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

const maskPhone = (value) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (!digits.length) return "";
  if (digits.length < 3) return `(${digits}`;
  if (digits.length <= 10)
    return digits.replace(/^(\d{2})(\d{0,4})(\d{0,4})$/, (_all, ddd, first, last) =>
      `(${ddd})${first ? ` ${first}` : ""}${last ? `-${last}` : ""}`,
    );
  return digits.replace(/^(\d{2})(\d{0,5})(\d{0,4})$/, (_all, ddd, first, last) =>
    `(${ddd})${first ? ` ${first}` : ""}${last ? `-${last}` : ""}`,
  );
};

const maskPostalCode = (value) =>
  onlyDigits(value).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");

const maskCardNumber = (value) =>
  onlyDigits(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");

const isValidCpf = (value) => {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const digit = (size) => {
    const sum = cpf
      .slice(0, size)
      .split("")
      .reduce((total, number, index) => total + Number(number) * (size + 1 - index), 0);
    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
};

const isValidCnpj = (value) => {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const digit = (base, factors) => {
    const sum = base
      .split("")
      .reduce((total, number, index) => total + Number(number) * factors[index], 0);
    const result = 11 - (sum % 11);
    return result >= 10 ? 0 : result;
  };
  const first = digit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = digit(`${cnpj.slice(0, 12)}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return first === Number(cnpj[12]) && second === Number(cnpj[13]);
};

const isValidCpfCnpj = (value) => isValidCpf(value) || isValidCnpj(value);

const isValidCardNumber = (value) => {
  const digits = onlyDigits(value);
  if (digits.length < 13 || digits.length > 19 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let number = Number(digits[index]);
    if (double) {
      number *= 2;
      if (number > 9) number -= 9;
    }
    sum += number;
    double = !double;
  }
  return sum % 10 === 0;
};

const paymentFormatters = {
  cpfCnpj: maskCpfCnpj,
  phone: maskPhone,
  postalCode: maskPostalCode,
  address: (value) => String(value || "").slice(0, 150),
  addressNumber: (value) => String(value || "").slice(0, 20),
  complement: (value) => String(value || "").slice(0, 80),
  province: (value) => String(value || "").slice(0, 100),
  cardHolderName: (value) => String(value || "")
    .replace(/[0-9]/g, "")
    .replace(/\s{2,}/g, " ")
    .toUpperCase()
    .slice(0, 100),
  cardNumber: maskCardNumber,
  expiryMonth: (value) => onlyDigits(value).slice(0, 2),
  expiryYear: (value) => onlyDigits(value).slice(0, 4),
  cvv: (value) => onlyDigits(value).slice(0, 4),
};

function Field({ icon: Icon, ...props }) {
  return (
    <View style={styles.field}>
      <Icon size={19} color={colors.copperLight} />
      <TextInput
        placeholderTextColor={colors.subtle}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const registerFieldLabels = {
  name: "Nome completo",
  email: "E-mail",
  password: "Senha",
  passwordConfirmation: "Confirmar senha",
  phone: "Telefone",
  referralCode: "Código de indicação",
};

const errorsFromResponse = (error) => {
  const details = error?.response?.data?.details;
  const fieldErrors = details?.fieldErrors || {};
  const parsed = Object.fromEntries(
    Object.entries(fieldErrors)
      .filter(([, messages]) => messages?.[0])
      .map(([field, messages]) => [field, messages[0]]),
  );
  const duplicateFields = error?.response?.data?.fields;
  const fields = Array.isArray(duplicateFields)
    ? duplicateFields
    : duplicateFields
      ? [duplicateFields]
      : [];
  fields.forEach((field) => {
    if (!parsed[field])
      parsed[field] = field === "email"
        ? "Este e-mail já possui uma conta."
        : "Este dado já está cadastrado.";
  });
  return parsed;
};

function RegistrationField({ label, error, icon: Icon, hint, containerStyle, ...props }) {
  return (
    <View style={[styles.registrationFieldWrap, containerStyle]}>
      <Text style={styles.registrationLabel}>{label}</Text>
      <View style={[styles.registrationField, error && styles.registrationFieldError]}>
        <Icon size={18} color={error ? colors.danger : colors.primaryLight} />
        <TextInput
          placeholderTextColor={colors.subtle}
          style={styles.registrationInput}
          {...props}
        />
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}
export function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const scrollRef = useRef(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [appConfig, setAppConfig] = useState(null);
  const [configReady, setConfigReady] = useState(false);
  const [loginImageFailed, setLoginImageFailed] = useState(false);
  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      let cachedConfig = null;
      try {
        const cached = await AsyncStorage.getItem(APP_CONFIG_CACHE_KEY);
        if (cached) {
          cachedConfig = JSON.parse(cached);
          if (mounted) {
            setAppConfig(cachedConfig);
            setConfigReady(true);
          }
        }
      } catch {
        cachedConfig = null;
      }

      try {
        const { data } = await api.get("/app-config");
        if (data?.loginImageUrl && data.loginImageUrl !== cachedConfig?.loginImageUrl)
          await Image.prefetch(data.loginImageUrl).catch(() => false);
        await AsyncStorage.setItem(APP_CONFIG_CACHE_KEY, JSON.stringify(data));
        if (mounted) {
          setLoginImageFailed(false);
          setAppConfig(data);
        }
      } catch {
        // Sem rede, mantemos no aparelho a ultima configuracao carregada.
      } finally {
        if (mounted) setConfigReady(true);
      }
    };
    loadConfig();
    return () => {
      mounted = false;
    };
  }, []);
  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      await login(form.email.trim(), form.password);
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setLoading(false);
    }
  };
  if (!configReady)
    return (
      <View style={styles.authLoading}>
        <Brand />
        <ActivityIndicator color={colors.primaryLight} size="small" />
      </View>
    );

  const remoteLoginImage = appConfig?.loginImageUrl && !loginImageFailed;
  const revealFocusedField = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 180);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ImageBackground
        source={remoteLoginImage ? { uri: appConfig.loginImageUrl } : require("../../assets/essenza-cover.png")}
        style={styles.authBg}
        imageStyle={{ opacity: 0.64 }}
        onError={() => setLoginImageFailed(true)}
      >
        <LinearGradient
          colors={["rgba(5,5,7,.08)", "rgba(5,5,7,.68)", colors.deep]}
          style={styles.authGradient}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.authScroll}
            contentContainerStyle={styles.authScrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            showsVerticalScrollIndicator={false}
          >
          <View style={styles.authContent}>
            <Brand />
            <View style={styles.copy}>
              <Text style={styles.eyebrow}>{appConfig?.loginEyebrow || "SUA JORNADA COMEÇA AQUI"}</Text>
              <Text style={styles.title}>{appConfig?.loginHeadline || "Seu corpo pede equilíbrio."}</Text>
              <Text style={styles.subtitle}>
                {appConfig?.loginSubtitle || "Treinos, cuidado e evolução lado a lado, no seu ritmo."}
              </Text>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Field
              icon={Mail}
              placeholder="Seu melhor e-mail"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onFocus={revealFocusedField}
              returnKeyType="next"
              onChangeText={(email) => setForm({ ...form, email })}
            />
            <Field
              icon={LockKeyhole}
              placeholder="Sua senha"
              secureTextEntry
              value={form.password}
              onFocus={revealFocusedField}
              returnKeyType="done"
              onSubmitEditing={submit}
              onChangeText={(password) => setForm({ ...form, password })}
            />
            <Button
              title={loading ? "Entrando..." : "Entrar na experiência"}
              onPress={submit}
              disabled={loading}
              icon={ArrowRight}
            />
            <View style={styles.links}>
              <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
                <Text style={styles.link}>Esqueci minha senha</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate("Register")}>
                <Text style={styles.link}>Criar minha conta</Text>
              </Pressable>
            </View>
          </View>
          </ScrollView>
        </LinearGradient>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}
export function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    passwordConfirmation: "",
    phone: "",
    referralCode: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError("");
  };
  const validate = () => {
    const errors = {};
    if (form.name.trim().length < 2)
      errors.name = "Informe seu nome completo.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim()))
      errors.email = "Informe um e-mail válido.";
    if (form.password.length < 8)
      errors.password = "Use pelo menos 8 caracteres.";
    else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password))
      errors.password = "A senha precisa ter letras e números.";
    if (form.password !== form.passwordConfirmation)
      errors.passwordConfirmation = "As senhas não são iguais.";
    if (form.phone.trim().length > 30)
      errors.phone = "Informe um telefone com no máximo 30 caracteres.";
    if (showReferral && form.referralCode.trim() && form.referralCode.trim().length < 4)
      errors.referralCode = "O código precisa ter pelo menos 4 caracteres.";
    return errors;
  };
  const submit = async () => {
    const errors = validate();
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setFormError("Revise os campos destacados abaixo.");
      return;
    }
    setLoading(true);
    setFormError("");
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        ...(form.phone.trim() && { phone: form.phone.trim() }),
        ...(showReferral && form.referralCode.trim() && {
          referralCode: form.referralCode.trim().toUpperCase(),
        }),
      });
    } catch (err) {
      const serverErrors = errorsFromResponse(err);
      setFieldErrors(serverErrors);
      setFormError(
        Object.keys(serverErrors).length
          ? "Revise os campos destacados abaixo."
          : messageFrom(err),
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={styles.registerKeyboard}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Screen header="Criar minha conta" onBack={navigation.goBack}>
        <View style={styles.registerHero}>
          <View style={styles.registerHeroIcon}><User size={20} color={colors.ink} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.registerHeroEyebrow}>ACESSO TRIADE FIT</Text>
            <Text style={styles.registerHeroTitle}>Vamos começar</Text>
            <Text style={styles.registerHeroText}>São só seus dados essenciais. O restante você completa depois, se quiser.</Text>
          </View>
        </View>
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <RegistrationField
          label={registerFieldLabels.name}
          icon={User}
          placeholder="Como você quer ser chamada?"
          autoCapitalize="words"
          autoComplete="name"
          value={form.name}
          error={fieldErrors.name}
          onChangeText={(value) => update("name", value)}
        />
        <RegistrationField
          label={registerFieldLabels.email}
          icon={Mail}
          placeholder="voce@exemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={form.email}
          error={fieldErrors.email}
          onChangeText={(value) => update("email", value)}
        />
        <RegistrationField
          label={registerFieldLabels.password}
          icon={LockKeyhole}
          placeholder="Crie uma senha"
          secureTextEntry
          autoComplete="new-password"
          value={form.password}
          error={fieldErrors.password}
          hint="Pelo menos 8 caracteres, com letras e números."
          onChangeText={(value) => update("password", value)}
        />
        <RegistrationField
          label={registerFieldLabels.passwordConfirmation}
          icon={LockKeyhole}
          placeholder="Digite a senha novamente"
          secureTextEntry
          autoComplete="new-password"
          value={form.passwordConfirmation || ""}
          error={fieldErrors.passwordConfirmation}
          onChangeText={(value) => update("passwordConfirmation", value)}
        />
        <RegistrationField
          label={`${registerFieldLabels.phone} (opcional)`}
          icon={Phone}
          placeholder="(00) 00000-0000"
          keyboardType="phone-pad"
          autoComplete="tel"
          value={form.phone}
          error={fieldErrors.phone}
          onChangeText={(value) => update("phone", value)}
        />
        <Pressable style={styles.referralToggle} onPress={() => setShowReferral((value) => !value)}>
          <Text style={styles.referralToggleText}>{showReferral ? "Não tenho código de indicação" : "Tenho um código de indicação"}</Text>
          <ArrowRight size={16} color={colors.primaryLight} style={showReferral && { transform: [{ rotate: "90deg" }] }} />
        </Pressable>
        {showReferral && (
          <RegistrationField
            label={registerFieldLabels.referralCode}
            icon={Clock3}
            placeholder="Ex.: TRIADE10"
            autoCapitalize="characters"
            value={form.referralCode}
            error={fieldErrors.referralCode}
            onChangeText={(value) => update("referralCode", value.toUpperCase())}
          />
        )}
        <Button
          title={loading ? "Criando sua conta..." : "Criar minha conta"}
          onPress={submit}
          disabled={loading}
          icon={ArrowRight}
        />
        <Text style={styles.registerFootnote}>Ao continuar, você cria seu acesso. A liberação dos treinos acontece após a confirmação do plano.</Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}
export function AccessPendingScreen() {
  const { user, logout, refreshUser } = useAuth();
  const status = user?.studentProfile?.accessStatus;
  const [loadingPayment, setLoadingPayment] = useState("");
  const [appConfig, setAppConfig] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [paymentMode, setPaymentMode] = useState("");
  const [pixData, setPixData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepFeedback, setCepFeedback] = useState("");
  const lastCepRequest = useRef("");
  const [paymentForm, setPaymentForm] = useState({
    cpfCnpj: "",
    phone: maskPhone(user?.phone || ""),
    postalCode: "",
    address: "",
    addressNumber: "",
    complement: "",
    province: "",
    cardHolderName: "",
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
  });
  const canPay = status === "PENDING_PAYMENT";
  const updatePayment = (field, value) => {
    const formatted = paymentFormatters[field]
      ? paymentFormatters[field](value)
      : value;
    setPaymentForm((current) => ({ ...current, [field]: formatted }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setError("");
  };
  useEffect(() => {
    const cep = onlyDigits(paymentForm.postalCode);
    if (cep.length !== 8) {
      lastCepRequest.current = "";
      setCepLoading(false);
      setCepFeedback(cep.length ? "Digite os 8 números do CEP." : "");
      return undefined;
    }
    if (lastCepRequest.current === cep) return undefined;
    lastCepRequest.current = cep;
    let active = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    setCepLoading(true);
    setCepFeedback("Consultando o CEP...");
    fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("CEP_REQUEST_FAILED");
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        if (data?.erro) {
          setFieldErrors((current) => ({
            ...current,
            postalCode: "CEP não encontrado. Confira os números.",
          }));
          setCepFeedback("");
          return;
        }
        setPaymentForm((current) => ({
          ...current,
          address: data?.logradouro || current.address,
          province: data?.bairro || current.province,
        }));
        setFieldErrors((current) => {
          const next = { ...current };
          delete next.postalCode;
          if (data?.logradouro) delete next.address;
          if (data?.bairro) delete next.province;
          return next;
        });
        const city = [data?.localidade, data?.uf].filter(Boolean).join(" - ");
        setCepFeedback(city ? `${city} · endereço preenchido` : "Endereço preenchido pelo CEP.");
      })
      .catch((requestError) => {
        if (!active) return;
        setCepFeedback(
          requestError?.name === "AbortError"
            ? "A consulta demorou. Você ainda pode preencher o endereço manualmente."
            : "Não foi possível consultar agora. Preencha o endereço manualmente.",
        );
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (active) setCepLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [paymentForm.postalCode]);
  const validatePayment = (withCard = false) => {
    const errors = {};
    if (!isValidCpfCnpj(paymentForm.cpfCnpj))
      errors.cpfCnpj = "Informe um CPF ou CNPJ válido.";
    if (![10, 11].includes(onlyDigits(paymentForm.phone).length))
      errors.phone = "Informe um celular válido com DDD.";
    if (onlyDigits(paymentForm.postalCode).length !== 8)
      errors.postalCode = "Informe um CEP válido com 8 números.";
    if (paymentForm.address.trim().length < 3)
      errors.address = "Informe o endereço.";
    if (!paymentForm.addressNumber.trim())
      errors.addressNumber = "Informe o número.";
    if (paymentForm.province.trim().length < 2)
      errors.province = "Informe o bairro.";
    if (withCard) {
      const cardNumber = onlyDigits(paymentForm.cardNumber);
      const month = Number(paymentForm.expiryMonth);
      const year = Number(paymentForm.expiryYear);
      const now = new Date();
      if (paymentForm.cardHolderName.trim().length < 3)
        errors.cardHolderName = "Informe o nome impresso no cartão.";
      if (!isValidCardNumber(cardNumber))
        errors.cardNumber = "Informe um número de cartão válido.";
      if (month < 1 || month > 12)
        errors.expiryMonth = "Use um mês entre 01 e 12.";
      if (
        !/^\d{4}$/.test(paymentForm.expiryYear) ||
        year < now.getFullYear() ||
        (year === now.getFullYear() && month < now.getMonth() + 1)
      )
        errors.expiryYear = "A validade do cartão está vencida ou inválida.";
      if (!/^\d{3,4}$/.test(onlyDigits(paymentForm.cvv)))
        errors.cvv = "Informe um CVV válido.";
    }
    return errors;
  };
  const paymentPayload = (includeCard = false) => ({
    cpfCnpj: onlyDigits(paymentForm.cpfCnpj),
    phone: onlyDigits(paymentForm.phone),
    postalCode: onlyDigits(paymentForm.postalCode),
    address: paymentForm.address.trim(),
    addressNumber: paymentForm.addressNumber.trim(),
    complement: paymentForm.complement.trim(),
    province: paymentForm.province.trim(),
    ...(includeCard
      ? {
          cardHolderName: paymentForm.cardHolderName.trim(),
          cardNumber: onlyDigits(paymentForm.cardNumber),
          expiryMonth: onlyDigits(paymentForm.expiryMonth),
          expiryYear: onlyDigits(paymentForm.expiryYear),
          cvv: onlyDigits(paymentForm.cvv),
        }
      : {}),
  });
  const confirmLogout = () => {
    const title = "Sair da Triade FIT?";
    const message = "Você precisará entrar novamente para acessar sua jornada.";
    if (Platform.OS === "web") {
      if (globalThis.confirm(`${title}\n\n${message}`)) logout();
      return;
    }
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: logout },
    ]);
  };
  const generatePix = async () => {
    const errors = validatePayment(false);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setError("Revise os campos destacados.");
      return;
    }
    setLoadingPayment("PIX");
    setError("");
    try {
      const { data } = await api.post(
        "/billing/initial-plan/pix",
        paymentPayload(false),
      );
      setPixData(data);
    } catch (err) {
      setFieldErrors(errorsFromResponse(err));
      setError(messageFrom(err));
    } finally {
      setLoadingPayment("");
    }
  };
  const payWithCard = async () => {
    const errors = validatePayment(true);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setError("Revise os campos destacados.");
      return;
    }
    setLoadingPayment("CREDIT_CARD");
    setError("");
    try {
      const { data } = await api.post(
        "/billing/initial-plan/card",
        paymentPayload(true),
        { timeout: 65000 },
      );
      setPaymentForm((current) => ({
        ...current,
        cardNumber: "",
        cvv: "",
      }));
      if (data.accessReleased || ["CONFIRMED", "RECEIVED"].includes(data.status))
        await refreshUser();
      else
        setError("O cartão foi enviado e está em processamento. Toque em verificar pagamento.");
    } catch (err) {
      setPaymentForm((current) => ({ ...current, cvv: "" }));
      setFieldErrors(errorsFromResponse(err));
      setError(messageFrom(err));
    } finally {
      setLoadingPayment("");
    }
  };
  const copyPix = async () => {
    if (!pixData?.payload) return;
    await Clipboard.setStringAsync(pixData.payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  const verifyAccess = async () => {
    setRefreshing(true);
    setError("");
    try {
      await api.post("/billing/initial-plan/sync");
      await refreshUser();
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setRefreshing(false);
    }
  };
  useEffect(() => {
    api.get("/app-config")
      .then(({ data }) => setAppConfig(data))
      .catch((err) => setError(messageFrom(err)));
  }, []);
  const plan = appConfig?.plan;
  const formatMoney = (cents) => {
    if (!Number.isFinite(Number(cents))) return "—";
    return (Number(cents) / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };
  const message = status === "OVERDUE"
    ? "Identificamos uma pendência no pagamento. Regularize com a equipe para voltar aos seus treinos."
    : status === "BLOCKED" || status === "CANCELLED"
      ? "Seu acesso está indisponível no momento. Fale com a equipe Triade FIT para receber orientação."
      : "Escolha Pix ou cartão. Todo o pagamento acontece aqui no app.";
  const billingFields = (
    <>
      <Text style={styles.paymentSectionTitle}>Dados da pagadora</Text>
      <Text style={styles.paymentSectionText}>Usados somente pelo Asaas para processar este pagamento.</Text>
      <RegistrationField
        label="E-mail da cobrança"
        icon={Mail}
        value={user?.email || ""}
        editable={false}
        selectTextOnFocus
        autoComplete="email"
        textContentType="emailAddress"
        hint="Preenchido automaticamente com o e-mail da sua conta."
      />
      <RegistrationField
        label="CPF ou CNPJ"
        icon={IdCard}
        placeholder="000.000.000-00"
        keyboardType="number-pad"
        maxLength={18}
        autoComplete="off"
        value={paymentForm.cpfCnpj}
        error={fieldErrors.cpfCnpj}
        onChangeText={(value) => updatePayment("cpfCnpj", value)}
      />
      <RegistrationField
        label="Celular com DDD"
        icon={Phone}
        placeholder="(00) 00000-0000"
        keyboardType="phone-pad"
        maxLength={15}
        autoComplete="tel"
        textContentType="telephoneNumber"
        importantForAutofill="yes"
        value={paymentForm.phone}
        error={fieldErrors.phone}
        onChangeText={(value) => updatePayment("phone", value)}
      />
      <View style={styles.paymentRow}>
        <RegistrationField
          containerStyle={styles.paymentRowWide}
          label="CEP"
          icon={MapPin}
          placeholder="00000-000"
          keyboardType="number-pad"
          maxLength={9}
          autoComplete="postal-code"
          textContentType="postalCode"
          importantForAutofill="yes"
          value={paymentForm.postalCode}
          error={fieldErrors.postalCode}
          hint={cepLoading ? "Consultando o CEP..." : cepFeedback || "Rua e bairro serão preenchidos automaticamente."}
          onChangeText={(value) => updatePayment("postalCode", value)}
        />
        <RegistrationField
          containerStyle={styles.paymentRowNarrow}
          label="Número"
          icon={Hash}
          placeholder="123"
          value={paymentForm.addressNumber}
          error={fieldErrors.addressNumber}
          onChangeText={(value) => updatePayment("addressNumber", value)}
        />
      </View>
      <RegistrationField
        label="Endereço"
        icon={MapPin}
        placeholder="Rua ou avenida"
        autoComplete="street-address"
        textContentType="streetAddressLine1"
        importantForAutofill="yes"
        value={paymentForm.address}
        error={fieldErrors.address}
        onChangeText={(value) => updatePayment("address", value)}
      />
      <RegistrationField
        label="Bairro"
        icon={Building2}
        placeholder="Seu bairro"
        value={paymentForm.province}
        error={fieldErrors.province}
        onChangeText={(value) => updatePayment("province", value)}
      />
      <RegistrationField
        label="Complemento (opcional)"
        icon={Building2}
        placeholder="Apto, bloco..."
        value={paymentForm.complement}
        error={fieldErrors.complement}
        onChangeText={(value) => updatePayment("complement", value)}
      />
    </>
  );
  return (
    <KeyboardAvoidingView
      style={styles.registerKeyboard}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Screen style={styles.accessScreen}>
      <View style={styles.accessCard}>
        <View style={styles.accessIcon}><Clock3 size={27} color={colors.ink} /></View>
        <Text style={styles.eyebrow}>ACESSO EM ANÁLISE</Text>
        <Text style={styles.accessTitle}>Olá, {user?.name?.split(" ")[0]}.</Text>
        <Text style={styles.accessText}>{message}</Text>
        {canPay && plan ? (
          <View style={styles.planBox}>
            {appConfig?.paymentBannerUrl ? (
              <ImageBackground
                source={{ uri: appConfig.paymentBannerUrl }}
                style={styles.planBanner}
                imageStyle={styles.planBannerImage}
              >
                <LinearGradient
                  colors={["transparent", "rgba(20,13,11,.92)"]}
                  style={styles.planBannerGradient}
                />
              </ImageBackground>
            ) : null}
            <Text style={styles.planEyebrow}>OFERTA DE LANÇAMENTO</Text>
            <Text style={styles.planTitle}>{plan.title}</Text>
            <Text style={styles.planDetail}>{plan.description}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Pix à vista</Text>
              <Text style={styles.planPrice}>{formatMoney(plan.pix.totalCents)}</Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceRow}>
              <View>
                <Text style={styles.priceLabel}>Cartão</Text>
                <Text style={styles.installmentText}>
                  {plan.card.installments}x de {formatMoney(plan.card.installmentCents)}
                </Text>
              </View>
              <Text style={styles.cardTotal}>{formatMoney(plan.card.totalCents)}</Text>
            </View>
            <Text style={styles.interestText}>
              {plan?.card.interestPercent > 0
                ? `${plan.card.interestPercent}% de juros (${formatMoney(plan.card.interestCents)}) já incluídos no total`
                : "Cartão sem juros"}
            </Text>
          </View>
        ) : null}
        {canPay && !plan ? (
          <View style={styles.planLoading}>
            <ActivityIndicator size="small" color={colors.primaryLight} />
            <Text style={styles.planLoadingText}>Carregando valores atualizados do plano...</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {canPay && plan && !paymentMode ? (
          <>
            <Button
              title={`Gerar Pix · ${formatMoney(plan.pix.totalCents)}`}
              onPress={() => {
                setPaymentMode("PIX");
                setError("");
              }}
              icon={QrCode}
            />
            <Button
              title={`Pagar no cartão · ${plan.card.installments}x de ${formatMoney(plan.card.installmentCents)}`}
              onPress={() => {
                setPaymentMode("CREDIT_CARD");
                setError("");
              }}
              variant="secondary"
              icon={CreditCard}
              style={styles.cardButton}
            />
          </>
        ) : null}
        {canPay && paymentMode && !pixData ? (
          <View style={styles.paymentFormCard}>
            <Pressable
              style={styles.paymentBack}
              onPress={() => {
                setPaymentMode("");
                setFieldErrors({});
                setError("");
              }}
            >
              <Text style={styles.paymentBackText}>← Voltar às formas de pagamento</Text>
            </Pressable>
            <View style={styles.paymentMethodHeading}>
              <View style={styles.paymentMethodIcon}>
                {paymentMode === "PIX" ? <QrCode size={24} color={colors.ink} /> : <CreditCard size={24} color={colors.ink} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentMethodTitle}>{paymentMode === "PIX" ? "Pix dentro do app" : "Cartão dentro do app"}</Text>
                <Text style={styles.paymentMethodText}>{paymentMode === "PIX" ? "O QR Code aparece logo após confirmar os dados." : `Cobrança de ${formatMoney(plan.card.totalCents)} em ${plan.card.installments}x de ${formatMoney(plan.card.installmentCents)}.`}</Text>
              </View>
            </View>
            {billingFields}
            {paymentMode === "CREDIT_CARD" ? (
              <>
                <Text style={styles.paymentSectionTitle}>Dados do cartão</Text>
                <RegistrationField
                  label="Nome impresso no cartão"
                  icon={User}
                  placeholder="NOME COMO ESTÁ NO CARTÃO"
                  autoCapitalize="characters"
                  autoComplete="cc-name"
                  textContentType="name"
                  importantForAutofill="yes"
                  value={paymentForm.cardHolderName}
                  error={fieldErrors.cardHolderName}
                  onChangeText={(value) => updatePayment("cardHolderName", value)}
                />
                <RegistrationField
                  label="Número do cartão"
                  icon={CreditCard}
                  placeholder="0000 0000 0000 0000"
                  keyboardType="number-pad"
                  maxLength={23}
                  autoComplete="cc-number"
                  textContentType="creditCardNumber"
                  importantForAutofill="yes"
                  value={paymentForm.cardNumber}
                  error={fieldErrors.cardNumber}
                  onChangeText={(value) => updatePayment("cardNumber", value)}
                />
                <View style={styles.paymentRow}>
                  <RegistrationField
                    containerStyle={styles.paymentRowItem}
                    label="Mês"
                    icon={Clock3}
                    placeholder="MM"
                    keyboardType="number-pad"
                    maxLength={2}
                    autoComplete="cc-exp-month"
                    importantForAutofill="yes"
                    value={paymentForm.expiryMonth}
                    error={fieldErrors.expiryMonth}
                    onChangeText={(value) => updatePayment("expiryMonth", value)}
                  />
                  <RegistrationField
                    containerStyle={styles.paymentRowItem}
                    label="Ano"
                    icon={Clock3}
                    placeholder="AAAA"
                    keyboardType="number-pad"
                    maxLength={4}
                    autoComplete="cc-exp-year"
                    importantForAutofill="yes"
                    value={paymentForm.expiryYear}
                    error={fieldErrors.expiryYear}
                    onChangeText={(value) => updatePayment("expiryYear", value)}
                  />
                  <RegistrationField
                    containerStyle={styles.paymentRowItem}
                    label="CVV"
                    icon={LockKeyhole}
                    placeholder="123"
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={4}
                    autoComplete="cc-csc"
                    importantForAutofill="yes"
                    value={paymentForm.cvv}
                    error={fieldErrors.cvv}
                    onChangeText={(value) => updatePayment("cvv", value)}
                  />
                </View>
              </>
            ) : null}
            <Button
              title={
                loadingPayment
                  ? "Processando com segurança..."
                  : paymentMode === "PIX"
                    ? "Gerar QR Code Pix"
                    : `Pagar ${formatMoney(plan.card.totalCents)}`
              }
              onPress={paymentMode === "PIX" ? generatePix : payWithCard}
              disabled={Boolean(loadingPayment)}
              icon={paymentMode === "PIX" ? QrCode : CreditCard}
            />
            <Text style={styles.securePaymentText}>Seus dados de cartão não são salvos pela Triade FIT.</Text>
          </View>
        ) : null}
        {canPay && pixData ? (
          <View style={styles.pixCard}>
            <View style={styles.pixSuccessIcon}><CheckCircle2 size={28} color={colors.ink} /></View>
            <Text style={styles.pixTitle}>Pix gerado</Text>
            <Text style={styles.pixAmount}>{formatMoney(pixData.amountCents)}</Text>
            <Image
              source={{ uri: `data:image/png;base64,${pixData.encodedImage}` }}
              style={styles.pixQrCode}
            />
            <Text style={styles.pixHelp}>Escaneie o QR Code ou use o Pix copia e cola abaixo.</Text>
            <TextInput
              style={styles.pixPayload}
              value={pixData.payload}
              editable={false}
              multiline
              selectTextOnFocus
            />
            <Button
              title={copied ? "Código copiado" : "Copiar código Pix"}
              onPress={copyPix}
              icon={copied ? CheckCircle2 : Copy}
            />
            <Button
              title={refreshing ? "Verificando..." : "Já paguei, verificar agora"}
              onPress={verifyAccess}
              disabled={refreshing}
              variant="secondary"
              icon={RefreshCw}
              style={styles.cardButton}
            />
            <Pressable
              style={styles.paymentBack}
              onPress={() => {
                setPixData(null);
                setPaymentMode("");
              }}
            >
              <Text style={styles.paymentBackText}>Escolher outra forma de pagamento</Text>
            </Pressable>
          </View>
        ) : null}
        <Button title="Sair da conta" variant="secondary" onPress={confirmLogout} />
      </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
export function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [developmentToken, setDevelopmentToken] = useState("");
  const [error, setError] = useState("");
  const submit = async () => {
    setError("");
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setMessage(data.message);
      setDevelopmentToken(data.developmentResetToken || "");
    } catch (err) {
      setError(messageFrom(err));
    }
  };
  return (
    <Screen header="Recuperar senha" onBack={navigation.goBack}>
      <Text style={styles.formIntro}>
        Informe seu e-mail. Você receberá as instruções configuradas pela
        Personal.
      </Text>
      {message ? (
        <View style={styles.success}>
          <Text style={styles.successText}>{message}</Text>
          {developmentToken ? (
            <Button
              title="Continuar com token de desenvolvimento"
              variant="secondary"
              onPress={() =>
                navigation.navigate("ResetPassword", {
                  token: developmentToken,
                })
              }
            />
          ) : null}
        </View>
      ) : (
        <>
          <Field
            icon={Mail}
            placeholder="Seu e-mail"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Solicitar recuperação" onPress={submit} />
        </>
      )}
    </Screen>
  );
}

export function ResetPasswordScreen({ route, navigation }) {
  const [form, setForm] = useState({
    token: route.params?.token || "",
    password: "",
    confirmation: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (form.password !== form.confirmation) {
      return setError("As senhas não coincidem.");
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", {
        token: form.token,
        password: form.password,
      });
      navigation.popToTop();
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Screen header="Criar nova senha" onBack={navigation.goBack}>
      <Text style={styles.formIntro}>
        Escolha uma nova senha com letras e números.
      </Text>
      <Field
        icon={LockKeyhole}
        placeholder="Token de recuperação"
        value={form.token}
        onChangeText={(token) => setForm({ ...form, token })}
      />
      <Field
        icon={LockKeyhole}
        placeholder="Nova senha"
        secureTextEntry
        value={form.password}
        onChangeText={(password) => setForm({ ...form, password })}
      />
      <Field
        icon={LockKeyhole}
        placeholder="Confirmar nova senha"
        secureTextEntry
        value={form.confirmation}
        onChangeText={(confirmation) => setForm({ ...form, confirmation })}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title={loading ? "Alterando..." : "Salvar nova senha"}
        onPress={submit}
        disabled={loading}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  authLoading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 18, backgroundColor: colors.bg },
  authBg: { flex: 1, backgroundColor: colors.bg },
  authGradient: { flex: 1 },
  authScroll: { flex: 1 },
  authScrollContent: { flexGrow: 1, justifyContent: "flex-end" },
  authContent: { padding: 24, paddingTop: 70, paddingBottom: 68, backgroundColor: "rgba(5,5,7,.08)" },
  registerKeyboard: { flex: 1 },
  copy: { marginTop: 90, marginBottom: 25 },
  eyebrow: {
    color: colors.copperLight,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.7,
  },
  title: {
    maxWidth: 340,
    marginTop: 10,
    color: colors.text,
    fontSize: 43,
    lineHeight: 47,
    fontWeight: "900",
    letterSpacing: -1.2,
  },
  em: { color: colors.copperLight, fontStyle: "italic" },
  subtitle: {
    maxWidth: 330,
    marginTop: 12,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  field: {
    minHeight: 54,
    marginBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.input,
    color: colors.text,
    backgroundColor: "rgba(28,19,17,.94)",
  },
  input: { flex: 1, height: "100%", color: colors.text },
  links: {
    minHeight: 46,
    marginTop: 16,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  link: { paddingVertical: 12, color: colors.copperLight, fontSize: 12, fontWeight: "800" },
  error: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    color: "#FFD4DD",
    backgroundColor: "rgba(255,124,150,.12)",
    fontSize: 12,
  },
  formIntro: { marginBottom: 23, color: colors.muted, lineHeight: 21 },
  textarea: { minHeight: 90, paddingTop: 16, textAlignVertical: "top" },
  registerHero: { marginBottom: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "rgba(245,179,141,.3)", borderRadius: radii.card, backgroundColor: colors.surface },
  registerHeroIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: colors.primaryLight },
  registerHeroEyebrow: { color: colors.primaryLight, fontSize: 8, fontWeight: "900", letterSpacing: 1.05 },
  registerHeroTitle: { marginTop: 4, color: colors.text, fontSize: 18, fontWeight: "900" },
  registerHeroText: { marginTop: 4, color: colors.muted, fontSize: 10, lineHeight: 15 },
  registrationFieldWrap: { marginBottom: 14 },
  registrationLabel: { marginBottom: 7, color: colors.text, fontSize: 11, fontWeight: "800" },
  registrationField: { minHeight: 54, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: radii.input, backgroundColor: colors.surface },
  registrationFieldError: { borderColor: colors.danger, backgroundColor: "rgba(245,142,134,.07)" },
  registrationInput: { flex: 1, minHeight: 52, color: colors.text, fontSize: 13 },
  fieldError: { marginTop: 6, color: colors.danger, fontSize: 10, fontWeight: "700" },
  fieldHint: { marginTop: 6, color: colors.subtle, fontSize: 9, lineHeight: 13 },
  referralToggle: { minHeight: 44, marginBottom: 14, paddingHorizontal: 2, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  referralToggleText: { color: colors.primaryLight, fontSize: 11, fontWeight: "800" },
  registerFootnote: { marginTop: 13, color: colors.subtle, fontSize: 9, lineHeight: 14, textAlign: "center" },
  success: {
    padding: 18,
    borderRadius: radii.input,
    backgroundColor: "rgba(169,196,154,.13)",
  },
  successText: { color: colors.text, fontSize: 13, lineHeight: 20 },
  accessScreen: { backgroundColor: colors.bg },
  accessCard: { padding: 25, alignItems: "center", borderWidth: 1, borderColor: colors.line, borderRadius: radii.hero, backgroundColor: colors.surface },
  accessIcon: { width: 58, height: 58, alignItems: "center", justifyContent: "center", marginBottom: 20, borderRadius: 20, backgroundColor: colors.primaryLight },
  accessTitle: { marginTop: 6, color: colors.text, fontSize: 27, fontWeight: "900" },
  accessText: { marginTop: 12, marginBottom: 24, color: colors.muted, fontSize: 13, lineHeight: 21, textAlign: "center" },
  planBox: { width: "100%", marginBottom: 14, padding: 16, borderWidth: 1, borderColor: "rgba(243,174,125,.36)", borderRadius: 18, backgroundColor: "rgba(90,50,32,.28)" },
  planLoading: { width: "100%", minHeight: 104, marginBottom: 14, padding: 18, alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.surface },
  planLoadingText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  planBanner: { height: 112, margin: -16, marginBottom: 16, justifyContent: "flex-end" },
  planBannerImage: { borderTopLeftRadius: 17, borderTopRightRadius: 17 },
  planBannerGradient: { ...StyleSheet.absoluteFillObject },
  planEyebrow: { color: colors.copperLight, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  planTitle: { marginTop: 6, color: colors.text, fontSize: 16, fontWeight: "800" },
  planPrice: { color: colors.copperLight, fontSize: 22, fontWeight: "900" },
  planDetail: { marginTop: 4, marginBottom: 15, color: colors.muted, fontSize: 11, lineHeight: 16, fontWeight: "700" },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  priceLabel: { color: colors.text, fontSize: 12, fontWeight: "800" },
  priceDivider: { height: 1, marginVertical: 12, backgroundColor: colors.line },
  installmentText: { marginTop: 3, color: colors.copperLight, fontSize: 12, fontWeight: "900" },
  cardTotal: { color: colors.text, fontSize: 14, fontWeight: "900" },
  interestText: { marginTop: 10, color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: "right" },
  cardButton: { marginTop: 9 },
  refreshAccess: { width: "100%", minHeight: 40, marginTop: 2, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  refreshAccessText: { color: colors.copperLight, fontSize: 12, fontWeight: "800" },
  paymentFormCard: { width: "100%", marginBottom: 16, padding: 16, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface2 },
  paymentBack: { minHeight: 40, marginBottom: 10, justifyContent: "center" },
  paymentBackText: { color: colors.primaryLight, fontSize: 10, fontWeight: "800" },
  paymentMethodHeading: { marginBottom: 22, flexDirection: "row", alignItems: "center", gap: 12 },
  paymentMethodIcon: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: colors.primaryLight },
  paymentMethodTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  paymentMethodText: { marginTop: 4, color: colors.muted, fontSize: 10, lineHeight: 15 },
  paymentSectionTitle: { marginTop: 3, marginBottom: 4, color: colors.text, fontSize: 13, fontWeight: "900" },
  paymentSectionText: { marginBottom: 15, color: colors.subtle, fontSize: 9, lineHeight: 14 },
  paymentRow: { width: "100%", flexDirection: "row", gap: 9 },
  paymentRowWide: { flex: 1.25 },
  paymentRowNarrow: { flex: 0.75 },
  paymentRowItem: { flex: 1 },
  securePaymentText: { marginTop: 10, color: colors.subtle, fontSize: 9, lineHeight: 14, textAlign: "center" },
  pixCard: { width: "100%", marginBottom: 16, padding: 18, alignItems: "center", borderWidth: 1, borderColor: "rgba(169,196,154,.5)", borderRadius: radii.card, backgroundColor: colors.surface2 },
  pixSuccessIcon: { width: 52, height: 52, marginBottom: 10, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.success },
  pixTitle: { color: colors.text, fontSize: 21, fontWeight: "900" },
  pixAmount: { marginTop: 3, color: colors.primaryLight, fontSize: 25, fontWeight: "900" },
  pixQrCode: { width: 220, height: 220, marginVertical: 18, borderRadius: 12, backgroundColor: "#FFFFFF" },
  pixHelp: { marginBottom: 10, color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: "center" },
  pixPayload: { width: "100%", minHeight: 84, marginBottom: 12, padding: 12, color: colors.text, fontSize: 9, lineHeight: 13, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.bg, textAlignVertical: "top" },
});
