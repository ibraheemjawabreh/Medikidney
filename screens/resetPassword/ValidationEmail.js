import * as yup from "yup";

const ValidationEmail = yup.object().shape({
  email: yup
    .string()
    .required("يرجى إدخال البريد الإلكتروني")
    .email("البريد الإلكتروني غير صالح"),
});

export default ValidationEmail;