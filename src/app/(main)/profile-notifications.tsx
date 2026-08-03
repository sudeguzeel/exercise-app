import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Pressable } from "react-native";

const GREEN = "#70C900";
const ITEMS = [
  ["Antrenman hatırlatmaları", "Antrenman saatlerinden önce hatırlatma al.", true],
  ["Seri hatırlatmaları", "Serini korumana yardımcı olacak hatırlatmalar al.", true],
  ["Program güncellemeleri", "Programındaki değişikliklerden haberdar ol.", true],
  ["E-posta bildirimleri", "E-posta ile bilgilendirme almak istiyorum.", false],
  ["Pazarlama bildirimleri", "Özel kampanya ve önerilerden haberdar ol.", false],
] as const;

export default function ProfileNotificationsScreen() {
  const [preferences, setPreferences] = useState(
    ITEMS.map(([, , enabled]) => enabled),
  );

  const togglePreference = (index: number, value: boolean) => {
    setPreferences((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? value : item)),
    );
  };

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
    <Header title="Bildirimler" />
    <View style={s.intro}><View style={s.iconCircle}><Ionicons name="notifications-outline" size={31} color={GREEN} /></View><Text style={s.introText}>Hangi bildirimleri almak istediğini seçebilirsin.</Text></View>
    <View style={s.card}>{ITEMS.map(([title, description], index) => <View key={title} style={[s.row, index < ITEMS.length - 1 && s.border]}><View style={s.rowText}><Text style={s.title}>{title}</Text><Text style={s.description}>{description}</Text></View><Switch style={s.switch} value={preferences[index]} onValueChange={(value) => togglePreference(index, value)} trackColor={{ false: "#E1E4E8", true: "#73C900" }} thumbColor="#FFFFFF" /></View>)}</View>
    <Text style={s.note}>Bildirim tercihleri geçicidir ve henüz kalıcı olarak kaydedilmez.</Text>
  </ScrollView></SafeAreaView>;
}
function Header({ title }: { title: string }) { return <View style={s.header}><Pressable onPress={() => router.replace("/(main)/profile")} style={s.back}><Ionicons name="chevron-back" size={22} color={GREEN} /></Pressable><Text style={s.headerTitle}>{title}</Text><View style={{ width: 38 }} /></View>; }
const s = StyleSheet.create({ safe:{flex:1,backgroundColor:"#F8F9F4"},content:{padding:20,paddingTop:14},header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:28},back:{width:38,height:38,borderRadius:19,borderWidth:1,borderColor:"#A8D96D",alignItems:"center",justifyContent:"center",backgroundColor:"#FFF"},headerTitle:{fontSize:19,fontWeight:"900",color:"#202320"},intro:{flexDirection:"row",alignItems:"center",marginBottom:28},iconCircle:{width:66,height:66,borderRadius:33,alignItems:"center",justifyContent:"center",backgroundColor:"#EAF6D7"},introText:{flex:1,marginLeft:17,fontSize:13,lineHeight:19,color:"#4F534E"},card:{overflow:"hidden",borderWidth:1,borderColor:"#DDE2D8",borderRadius:20,backgroundColor:"#FFF"},row:{minHeight:82,flexDirection:"row",alignItems:"center",paddingLeft:16,paddingRight:10},border:{borderBottomWidth:1,borderBottomColor:"#E2E5DF"},rowText:{flex:1,paddingRight:8},switch:{marginLeft:12,alignSelf:"center"},title:{fontSize:14,fontWeight:"800",color:"#202320"},description:{marginTop:5,fontSize:11,lineHeight:16,color:"#777B76"},note:{marginTop:14,fontSize:11,color:"#858985",textAlign:"center"} });
