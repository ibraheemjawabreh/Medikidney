import * as yup from 'yup';

const ValidationSearch = yup.object().shape({
  search: yup
    .string()
    .trim() 
    .required('حقل البحث مطلوب') 
    .min(3, 'يجب كتابة 3 أحرف على الأقل') 
    .max(50, 'نص البحث طويل جداً')
    .matches(/^[a-zA-Z\s\u0600-\u06FF]+$/, "الأسماء يجب أن تحتوي على حروف فقط")});

export default ValidationSearch