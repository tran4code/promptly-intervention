def myFunc(array):
   # ChatGPT created code
   return array
  
def testarr(input_array, expected, result):
   if result == expected:
       print("Test passed for input", input_array)
       print()
   else:
       print("Test failed for input", input_array)
       print("Expected result was", expected)
       print("But actual result was", result)
       print()


array = [[1, 2], [3, 4]]
result = myFunc(array)
expected = [[4, 2], [3, 1]]
testarr([[1, 2], [3, 4]], expected, result)
#show only first failure 

array = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
result = myFunc(array)
expected = [[9, 2, 3], [4, 5, 6], [7, 8, 1]]
testarr([[1, 2, 3], [4, 5, 6], [7, 8, 9]], expected, result)


array = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]
result = myFunc(array)
expected = [[11, 12, 3, 4], [15, 16, 7, 8], [9, 10, 1, 2], [13, 14, 5, 6]]
testarr([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]], expected, result)


array = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15], [16, 17, 18, 19, 20], [21, 22, 23, 24, 25]]
result = myFunc(array)
expected = [[19, 20, 3, 4, 5], [24, 25, 8, 9, 10], [11, 12, 13, 14, 15], [16, 17, 18, 1, 2], [21, 22, 23, 6, 7]]
testarr([[1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15], [16, 17, 18, 19, 20], [21, 22, 23, 24, 25]], expected, result)


def myFunc(num):
   # ChatGPT created code
   return num * 2 
  
def testFunc(input_given, expected, result):
   if result == expected:
       print("Test passed for input", input_given)
       print()
   else:
       print("Test failed for input", input_given)
       print("Expected result was", expected)
       print("But actual result was", result)
       print()


test_input = 2
expected = 4
result = myFunc(test_input)
testFunc(test_input, expected, result)

test_input = 25
expected = 50
result = myFunc(test_input)
testFunc(test_input, expected, result)
