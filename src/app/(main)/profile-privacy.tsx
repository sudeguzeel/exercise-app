import { useAppTheme } from "@/providers/AppThemeContext";
import { useThemedScreenStyles } from "@/shared/hooks/use-themed-screen-styles";
import { supabase } from "@/shared/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
const GREEN="#70C900";
const ITEMS=[
  ["Gizlilik Politikası","Kişisel verilerinin nasıl işlendiğini oku."],
  ["Kullanım Koşulları","Uygulamayı kullanırken kabul ettiğin koşulları incele."],
  ["Verilerini indir","Hesabına ait verilerin bir kopyasını indir."],
  ["Hesabı sil","Hesabını ve tüm verilerini kalıcı olarak sil."],
] as const;
const soon=()=>Alert.alert("Yakında","Bu özellik yakında kullanıma açılacaktır.");
export default function ProfilePrivacyScreen(){
  const s=useThemedScreenStyles(baseStyles);
  const {colors}=useAppTheme();
  const [deleting,setDeleting]=useState(false);
  const deleteAccount=async()=>{
    if(deleting)return;
    try{
      setDeleting(true);
      const {data:{session}}=await supabase.auth.getSession();
      if(!session){
        Alert.alert("Hata","Oturum bulunamadı. Lütfen tekrar giriş yap.");
        return;
      }
      const {data,error}=await supabase.functions.invoke("delete-account");
      if(error||(data as {error?:string}|null)?.error){
        Alert.alert("Hesap silinemedi","Lütfen tekrar dene.");
        return;
      }
      await supabase.auth.signOut();
      router.replace("/login");
    }catch{
      Alert.alert("Hesap silinemedi","Lütfen tekrar dene.");
    }finally{
      setDeleting(false);
    }
  };
  const confirmDeleteAccount=()=>{
    if(deleting)return;
    Alert.alert(
      "Hesabını silmek istediğine emin misin?",
      "Bu işlem geri alınamaz. Hesabın ve tüm verilerin kalıcı olarak silinecek.",
      [
        {text:"Vazgeç",style:"cancel"},
        {text:"Hesabımı sil",style:"destructive",onPress:()=>void deleteAccount()},
      ],
    );
  };
  const onPressFor=(title:string)=>title==="Hesabı sil"?confirmDeleteAccount:soon;
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}><Header title="Gizlilik"/><View style={s.intro}><View style={s.iconCircle}><Ionicons name="shield-checkmark-outline" size={34} color={GREEN}/></View><Text style={s.introText}>Hesabın ve verilerin ile ilgili ayarlara buradan ulaşabilirsin.</Text></View><View style={s.card}>{ITEMS.map(([title,description],index)=><Pressable key={title} disabled={title==="Hesabı sil"&&deleting} onPress={onPressFor(title)} style={[s.row,index<ITEMS.length-1&&s.border]}><View style={s.rowText}><Text style={s.title}>{title}</Text><Text style={s.description}>{description}</Text></View>{title==="Hesabı sil"&&deleting?<ActivityIndicator color={GREEN}/>:<Ionicons name="chevron-forward" size={18} color={colors.textSecondary}/>}</Pressable>)}</View><View style={s.warning}><Ionicons name="lock-closed-outline" size={20} color={GREEN}/><Text style={s.warningText}>Hesap silme işlemi geri alınamaz. Silme işleminden önce mutlaka emin ol.</Text></View></ScrollView></SafeAreaView>;
}
function Header({title}:{title:string}){const s=useThemedScreenStyles(baseStyles);return <View style={s.header}><Pressable onPress={()=>router.replace("/(main)/profile")} style={s.back}><Ionicons name="chevron-back" size={22} color={GREEN}/></Pressable><Text style={s.headerTitle}>{title}</Text><View style={{width:38}}/></View>}
const baseStyles=StyleSheet.create({safe:{flex:1,backgroundColor:"#F8F9F4"},content:{padding:20,paddingTop:14,paddingBottom:30},header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:28},back:{width:38,height:38,borderRadius:19,borderWidth:1,borderColor:"#A8D96D",alignItems:"center",justifyContent:"center",backgroundColor:"#FFF"},headerTitle:{fontSize:19,fontWeight:"900",color:"#202320"},intro:{flexDirection:"row",alignItems:"center",marginBottom:28},iconCircle:{width:66,height:66,borderRadius:33,alignItems:"center",justifyContent:"center",backgroundColor:"#EAF6D7"},introText:{flex:1,marginLeft:17,fontSize:13,lineHeight:19,color:"#4F534E"},card:{overflow:"hidden",borderWidth:1,borderColor:"#DDE2D8",borderRadius:20,backgroundColor:"#FFF"},row:{minHeight:74,flexDirection:"row",alignItems:"center",paddingHorizontal:16},border:{borderBottomWidth:1,borderBottomColor:"#E2E5DF"},rowText:{flex:1,paddingRight:12},title:{fontSize:14,fontWeight:"800",color:"#202320"},description:{marginTop:5,fontSize:11,lineHeight:16,color:"#777"},warning:{marginTop:18,flexDirection:"row",alignItems:"center",padding:16,borderWidth:1,borderColor:"#D7E9B6",borderRadius:16,backgroundColor:"#F1F8E5"},warningText:{flex:1,marginLeft:12,fontSize:11,lineHeight:16,color:"#727671"}});
