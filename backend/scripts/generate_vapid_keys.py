"""
VAPID Key Generator
Generates VAPID public/private key pair for Web Push notifications.

Run this script once to generate keys, then add them to your .env file.

Usage:
    python scripts/generate_vapid_keys.py
"""

def generate_vapid_keys():
    """Generate VAPID key pair using py_vapid library."""
    try:
        from py_vapid import Vapid
        
        print("🔑 Generating VAPID key pair for Web Push notifications...\n")
        
        vapid = Vapid()
        vapid.generate_keys()
        
        # Get base64-encoded keys
        public_key = vapid.public_key
        private_key = vapid.private_key
        
        print("=" * 60)
        print("VAPID KEYS GENERATED SUCCESSFULLY")
        print("=" * 60)
        print("\nAdd these to your backend/.env file:\n")
        print(f"VAPID_PUBLIC_KEY={public_key}")
        print(f"VAPID_PRIVATE_KEY={private_key}")
        print("VAPID_CLAIMS_EMAIL=mailto:admin@cur8.fun")
        print("\n" + "=" * 60)
        print("\n⚠️  IMPORTANT:")
        print("- Keep the PRIVATE_KEY secret and secure!")
        print("- The PUBLIC_KEY is shared with browsers")
        print("- Store these keys safely - you'll need them for production")
        print("- If you lose the private key, all existing subscriptions become invalid")
        print("=" * 60)
        
        return public_key, private_key
        
    except ImportError:
        print("❌ py_vapid not installed. Installing...")
        import subprocess
        subprocess.run(["pip", "install", "py-vapid"], check=True)
        print("\n✅ py_vapid installed. Run this script again.")
        return None, None


def generate_with_cryptography():
    """Alternative method using cryptography library directly."""
    try:
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.backends import default_backend
        import base64
        
        print("🔑 Generating VAPID keys using cryptography library...\n")
        
        # Generate ECDSA key pair on P-256 curve
        private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
        public_key = private_key.public_key()
        
        # Export private key as raw bytes (32 bytes for P-256)
        private_numbers = private_key.private_numbers()
        private_bytes = private_numbers.private_value.to_bytes(32, byteorder='big')
        
        # Export public key as uncompressed point (65 bytes: 0x04 + x + y)
        public_numbers = public_key.public_numbers()
        x_bytes = public_numbers.x.to_bytes(32, byteorder='big')
        y_bytes = public_numbers.y.to_bytes(32, byteorder='big')
        public_bytes = b'\x04' + x_bytes + y_bytes
        
        # Base64url encode (without padding)
        def base64url_encode(data):
            return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')
        
        private_key_b64 = base64url_encode(private_bytes)
        public_key_b64 = base64url_encode(public_bytes)
        
        print("=" * 60)
        print("VAPID KEYS GENERATED SUCCESSFULLY")
        print("=" * 60)
        print("\nAdd these to your backend/.env file:\n")
        print(f"VAPID_PUBLIC_KEY={public_key_b64}")
        print(f"VAPID_PRIVATE_KEY={private_key_b64}")
        print("VAPID_CLAIMS_EMAIL=mailto:admin@cur8.fun")
        print("\n" + "=" * 60)
        
        return public_key_b64, private_key_b64
        
    except Exception as e:
        print(f"❌ Error generating keys: {e}")
        return None, None


if __name__ == "__main__":
    public_key, private_key = generate_vapid_keys()
    
    if not public_key:
        print("\n🔄 Trying alternative method...")
        generate_with_cryptography()
