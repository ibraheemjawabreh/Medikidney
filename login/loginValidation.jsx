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
    
});

export default LoginValidation
