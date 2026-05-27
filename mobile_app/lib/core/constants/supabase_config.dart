// Legacy shim — kept for backward compatibility.
// All new code should use AppConfig directly.
import 'app_config.dart';

class SupabaseConfig {
  static String get url => AppConfig.supabaseUrl;
  static String get anonKey => AppConfig.supabaseAnonKey;
}
