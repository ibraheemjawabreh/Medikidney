import * as yup from 'yup';

const LoginValidation = yup.object().shape({
  username: yup
    .string()
    .trim("لا يسمح بفراغات في البداية أو النهاية")
    .required("رجاء ادخل اسم المستخدم")
  ,

  password: yup
    .string()
    .required("الرجاء ادخال كلمة المرور")
    .min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

export default LoginValidation
