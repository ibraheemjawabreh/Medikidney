import * as yup from "yup";

const ValidationOtpCode =yup.object().shape({
 code:yup
 .string()
 .required("الرجاء ادخال الكود")
 .length(6,"الرجاء ادخال الكودالمكون من 6 ارقام"),

});
export default ValidationOtpCode;