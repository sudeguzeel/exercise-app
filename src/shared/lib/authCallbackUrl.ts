// Supabase auth linkleri (e-posta doğrulama, şifre sıfırlama, Google OAuth)
// projede `flowType: "implicit"` kullanıldığı için token'ları URL'in query
// kısmında değil `#` sonrasındaki fragment'ında gönderir
// (`...#access_token=...&refresh_token=...`). expo-router'ın
// `useLocalSearchParams`'ı fragment'ı okumaz; bu yüzden deep link URL'ini
// elle ayrıştırmak gerekiyor. Bu yardımcı fonksiyon hem query hem fragment'ı
// okuyup tek bir parametre kümesinde birleştirir (fragment, query ile aynı
// anahtara sahipse üzerine yazar).
export function getAuthCallbackParameters(url: string) {
  const queryStart = url.indexOf("?");
  const hashStart = url.indexOf("#");
  const queryEnd = hashStart >= 0 && hashStart > queryStart ? hashStart : url.length;
  const query = queryStart >= 0 ? url.slice(queryStart + 1, queryEnd) : "";
  const fragment = hashStart >= 0 ? url.slice(hashStart + 1) : "";
  const parameters = new URLSearchParams(query);

  new URLSearchParams(fragment).forEach((value, key) => {
    parameters.set(key, value);
  });

  return parameters;
}
