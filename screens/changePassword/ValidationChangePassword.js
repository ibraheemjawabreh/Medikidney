import * as yup from 'yup';

const ValidationChange = yup.object().shape({
    originalPassword: yup
        .string()
        .required("يجب عليك ادخال كلمة السر الاصلية"),

    newPssword: yup
        .string()
        .min(6, "كلمة السر يجب أن تكون 6 أحرف على الأقل")
        .required("يجب عليك ادخال كلمة السر الجديدة"),

    confirmPassword: yup
        .string()
        .oneOf([yup.ref('newPssword'), null], "كلمتا السر غير متطابقتين")
        .required("يجب تأكيد كلمة السر الجديدة")
});

export default ValidationChange;