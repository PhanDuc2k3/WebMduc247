export function createPhoneSender(config, mailTransport) {
  if (config.mode === 'email') {
    return async ({ email, code }) => {
      await mailTransport.sendMail({ from: config.mailFrom, to: email, subject: 'Mã xác nhận thêm số điện thoại Mduc247', text: `Mã xác nhận thêm hoặc đổi số điện thoại của bạn: ${code}. Mã hết hạn sau 5 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này. Mã này xác nhận thao tác trên tài khoản; không xác minh quyền sở hữu số điện thoại.` });
    };
  }
  if (config.mode === 'sms-webhook') {
    return async ({ phone, code }) => {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.webhookToken}` },
        body: JSON.stringify({ to: phone, message: `Mã xác thực MDUC247: ${code}. Hết hạn sau 5 phút.` }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error('SMS provider unavailable');
    };
  }
  return null;
}
