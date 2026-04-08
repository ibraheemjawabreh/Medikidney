import * as yup from 'yup';

const ValidationChange = yup.object().shape({
    oldPassword: yup
        .string()
        .required("يجب عليك ادخال كلمة السر الاصلية"),

    newPassword: yup
        .string()
        .min(8, "كلمة المرور قصيرة جداً، يجب أن تكون 8 خانات على الأقل")
        .required("يجب عليك ادخال كلمة السر الجديدة"),

    confirmPassword: yup
        .string()
        .oneOf([yup.ref('newPassword'), null], "كلمتا السر غير متطابقتين")
        .required("يجب تأكيد كلمة السر الجديدة")
});

export default ValidationChange;