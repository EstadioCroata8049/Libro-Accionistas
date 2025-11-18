import bcrypt from "bcryptjs";

const password = "croata123"; // Cambia esto por la contraseña que quieras
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error("Error generando hash:", err);
    process.exit(1);
  }
  
  console.log("\n=== Hash generado ===");
  console.log(`Contraseña: ${password}`);
  console.log(`Hash: ${hash}`);
  console.log("\nCopia este hash y úsalo en el UPDATE de Supabase:");
  console.log(`\nupdate public.users`);
  console.log(`set password = '${hash}'`);
  console.log(`where username = 'tu_usuario';\n`);
});
