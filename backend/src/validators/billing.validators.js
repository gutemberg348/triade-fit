import { z } from "zod";

const digits = (label) =>
  z.string({ error: `Informe ${label}.` }).trim().min(1, `Informe ${label}.`);

const isValidCpf = (value) => {
  const cpf = value.replace(/\D/g, "");
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
  const cnpj = value.replace(/\D/g, "");
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
  const digitsOnly = value.replace(/\D/g, "");
  if (
    digitsOnly.length < 13 ||
    digitsOnly.length > 19 ||
    /^(\d)\1+$/.test(digitsOnly)
  )
    return false;
  let sum = 0;
  let double = false;
  for (let index = digitsOnly.length - 1; index >= 0; index -= 1) {
    let number = Number(digitsOnly[index]);
    if (double) {
      number *= 2;
      if (number > 9) number -= 9;
    }
    sum += number;
    double = !double;
  }
  return sum % 10 === 0;
};

export const billingIdentityShape = {
  cpfCnpj: digits("o CPF ou CNPJ").refine(
    isValidCpfCnpj,
    "Informe um CPF ou CNPJ válido.",
  ),
  phone: digits("o celular com DDD").refine(
    (value) => {
      const length = value.replace(/\D/g, "").length;
      return length >= 10 && length <= 11;
    },
    "Informe um celular válido com DDD.",
  ),
  postalCode: digits("o CEP").refine(
    (value) => value.replace(/\D/g, "").length === 8,
    "Informe um CEP válido com 8 números.",
  ),
  address: z.string().trim().min(3, "Informe o endereço." ).max(150),
  addressNumber: z.string().trim().min(1, "Informe o número." ).max(20),
  complement: z.string().trim().max(80).optional().default(""),
  province: z.string().trim().min(2, "Informe o bairro." ).max(100),
};

export const pixPaymentSchema = z.object(billingIdentityShape);

export const cardPaymentSchema = z.object({
  ...billingIdentityShape,
  cardHolderName: z
    .string()
    .trim()
    .min(3, "Informe o nome impresso no cartão.")
    .max(100),
  cardNumber: digits("o número do cartão").refine(
    isValidCardNumber,
    "Informe um número de cartão válido.",
  ),
  expiryMonth: digits("o mês de validade").refine(
    (value) => {
      const month = Number(value);
      return month >= 1 && month <= 12;
    },
    "Informe um mês entre 01 e 12.",
  ),
  expiryYear: digits("o ano de validade").refine(
    (value) => /^\d{4}$/.test(value),
    "Informe o ano com 4 números.",
  ),
  cvv: digits("o código de segurança").refine(
    (value) => /^\d{3,4}$/.test(value.replace(/\D/g, "")),
    "Informe um CVV válido.",
  ),
});
