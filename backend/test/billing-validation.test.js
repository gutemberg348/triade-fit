import test from "node:test";
import assert from "node:assert/strict";
import {
  cardPaymentSchema,
  pixPaymentSchema,
} from "../src/validators/billing.validators.js";

const billing = {
  cpfCnpj: "529.982.247-25",
  phone: "(11) 99999-9999",
  postalCode: "01001-000",
  address: "Praça da Sé",
  addressNumber: "100",
  complement: "",
  province: "Sé",
};

test("pagamento aceita dados com máscaras e cartão válido", () => {
  const result = cardPaymentSchema.safeParse({
    ...billing,
    cardHolderName: "CLIENTE TESTE",
    cardNumber: "4111 1111 1111 1111",
    expiryMonth: "12",
    expiryYear: "2030",
    cvv: "123",
  });

  assert.equal(result.success, true);
});

test("pagamento aponta CPF e número de cartão inválidos", () => {
  const pixResult = pixPaymentSchema.safeParse({
    ...billing,
    cpfCnpj: "111.111.111-11",
  });
  const cardResult = cardPaymentSchema.safeParse({
    ...billing,
    cardHolderName: "CLIENTE TESTE",
    cardNumber: "4111 1111 1111 1112",
    expiryMonth: "12",
    expiryYear: "2030",
    cvv: "123",
  });

  assert.equal(pixResult.success, false);
  assert.equal(cardResult.success, false);
  assert.equal(pixResult.error.issues[0].path[0], "cpfCnpj");
  assert.equal(cardResult.error.issues[0].path[0], "cardNumber");
});
