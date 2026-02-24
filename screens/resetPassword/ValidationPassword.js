import * as yup from "yup";

const ValidationPassword = yup.object().shape({
  newPassword: yup
    .string()
    .min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل")
    .required("يجب عليك إدخال كلمة المرور الجديدة"),
  
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("newPassword"), null], "كلمتا المرور غير متطابقتين")
    .required("يجب تأكيد كلمة المرور الجديدة"),
});

export default ValidationPassword;