import { Button } from "@rneui/base"
import { Input } from "@rneui/themed"
import { Text, View } from "react-native"

import ValidationChange from "./ValidationChangePassword"




const ChangePassword = () => {
    return (
        <View>
            <Text>
                تغيير كلمة المرور
            </Text>
            <Input
                placeholder="ادخل كلمة السر القديمة"
            // value=""
            // onChangeText={}

            />
            <Input
                placeholder="ادخل كلمة السر الجديدة"
            // value=""
            // onChangeText={}

            />
            <Input
                placeholder="ادخل كلمة السر الجديدة"
            // value=""
            // onChangeText={}

            />
            <View>
                <Button
                    title="تغيير كلمة المرور"
                    buttonStyle={{ backgroundColor: 'rgb(56, 33, 32)' }}
                    containerStyle={{
                        height: 40,
                        width: 200,
                        marginHorizontal: 50,
                        marginVertical: 10,
                    }}
                    titleStyle={{ color: 'white', marginHorizontal: 20 }}
                />

            </View>
        </View>
    )
}

export default ChangePassword