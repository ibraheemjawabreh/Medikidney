import { Input } from "@rneui/base"
import { Text } from "react-native"
import { View } from "react-native"


const EmailInput=()=>{
    const [Email,setEmail]=useState('')
    return(
        <View>
            <Text>يرجى ادخال البريد الالكتروني</Text>
            <Input  
            placeholder="البريد الالكتروني"
            value={Email}
            // onChangeText={}

            
            />
        </View>
    )
}