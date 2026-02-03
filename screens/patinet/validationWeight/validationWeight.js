import * as yup from 'yup'



const validationWeight=yup.object().shape({
    weight:yup.string().required().min(2).max(3).number()
})

export default validationWeight