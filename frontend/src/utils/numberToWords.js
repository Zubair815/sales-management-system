const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']

function numberToWords(num) {
  if (num === 0) return 'Zero'
  if (num < 0) return 'Minus ' + numberToWords(-num)
  let result = ''
  if (num >= 10000000) { result += numberToWords(Math.floor(num/10000000)) + ' Crore '; num %= 10000000 }
  if (num >= 100000) { result += numberToWords(Math.floor(num/100000)) + ' Lakh '; num %= 100000 }
  if (num >= 1000) { result += numberToWords(Math.floor(num/1000)) + ' Thousand '; num %= 1000 }
  if (num >= 100) { result += ones[Math.floor(num/100)] + ' Hundred '; num %= 100 }
  if (num >= 20) { result += tens[Math.floor(num/10)] + ' '; num %= 10 }
  if (num > 0) result += ones[num] + ' '
  return result.trim()
}

export function amountToWords(amount) {
  const num = parseFloat(amount)
  const intPart = Math.floor(num)
  const decPart = Math.round((num - intPart) * 100)
  let result = numberToWords(intPart) + ' Rupees'
  if (decPart > 0) result += ' and ' + numberToWords(decPart) + ' Paise'
  return result + ' Only'
}
